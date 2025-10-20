import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiTags } from '@nestjs/swagger';
import { CfgService } from 'src/services/cfg.service';
import { PrintService } from 'src/services/print.service';
import { QueueService } from 'src/services/queue.service';

export class TableItemDTO {
  @ApiProperty()
  content?: string;

  @ApiProperty({
    enum: ['left', 'center', 'right'],
    default: 'left',
  })
  align?: 'left' | 'center' | 'right';
}

export class TableLineDTO {
  @ApiProperty({ type: [TableItemDTO] })
  items: TableItemDTO[];
}

export class TableDTO {
  @ApiProperty({ type: [TableLineDTO] })
  lines: TableLineDTO[];

  @ApiProperty({ required: false, default: false })
  cut?: boolean;

  @ApiProperty({ required: false, default: false })
  verticalBorders?: boolean;

  @ApiProperty({ required: false, default: false })
  horizontalBorders?: boolean;

  @ApiProperty({ required: false, default: [], type: [Number] })
  columnWidths?: number[];
}

@Controller()
@ApiTags('app')
export class TableController {
  constructor(
    private readonly print: PrintService,
    private readonly queue: QueueService,
    private readonly cfg: CfgService,
  ) {}

  @Post('table')
  @ApiBody({
    description: 'Start a table print job',
    type: TableDTO,
    required: true,
  })
  async printReceipt(@Body() table: TableDTO): Promise<string> {
    if (!table) throw new HttpException('No table provided', 400);
    if (!Array.isArray(table.lines) || table.lines.length === 0) {
      throw new HttpException('Table must include at least one line', 400);
    }

    const release = await this.queue.acquire();
    try {
      // Spaltenanzahl bestimmen
      const columns = table.lines.reduce(
        (m, l) => Math.max(m, l.items?.length ?? 0),
        0,
      );
      if (columns === 0)
        throw new HttpException(
          'Each table line must include at least one item',
          400,
        );

      // Zeilen normalisieren
      const normalizedLines: TableLineDTO[] = table.lines.map((l, i) => {
        if (!Array.isArray(l.items))
          throw new HttpException(`Line ${i} has no items array`, 400);
        const items = [...l.items];
        while (items.length < columns)
          items.push({ content: '', align: 'left' });
        return { items };
      });

      // columnWidths wie Grid-Fractions behandeln
      let weights: number[] = Array.isArray(table.columnWidths)
        ? [...table.columnWidths]
        : [];
      if (weights.length > columns) weights = weights.slice(0, columns);
      while (weights.length < columns) weights.push(1);
      if (
        weights.some((w) => typeof w !== 'number' || !isFinite(w) || w <= 0)
      ) {
        throw new HttpException(
          'columnWidths must be positive finite numbers',
          400,
        );
      }

      // Druckbreite und Separator
      const charsPerLine = this.cfg.printTextCharsPerLine;
      if (
        typeof charsPerLine !== 'number' ||
        !isFinite(charsPerLine) ||
        charsPerLine <= 0
      ) {
        throw new HttpException(
          'Invalid printer character width configuration',
          500,
        );
      }
      const vBorders = !!table.verticalBorders;
      const hBorders = !!table.horizontalBorders;
      const sepWidth = 1;
      const totalSep = (columns - 1) * sepWidth;
      const availableForColumns = Math.max(1, charsPerLine - totalSep);

      // Spaltenbreiten berechnen
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const charWidths = weights.map((w) =>
        Math.max(1, Math.floor((w / totalWeight) * availableForColumns)),
      );
      const sum = charWidths.reduce((a, b) => a + b, 0);
      if (sum > availableForColumns)
        charWidths[charWidths.length - 1] -= sum - availableForColumns;
      if (sum < availableForColumns)
        charWidths[charWidths.length - 1] += availableForColumns - sum;

      // Helfer
      const wrapText = (text: string, width: number): string[] => {
        if (!text) return [''];
        const out: string[] = [];
        for (let i = 0; i < text.length; i += width)
          out.push(text.slice(i, i + width));
        return out;
      };
      const clamp = (n: number, min: number, max: number) =>
        Math.min(max, Math.max(min, n));

      const makeHR = (): string => {
        if (vBorders) {
          const pieces = charWidths.map((w) => '-'.repeat(w));
          let line = '+' + pieces.join('+') + '+';
          if (line.length < charsPerLine)
            line += '-'.repeat(charsPerLine - line.length);
          if (line.length > charsPerLine) line = line.slice(0, charsPerLine);
          return line;
        }
        return '-'.repeat(charsPerLine);
      };

      // Items validieren
      for (const [r, line] of normalizedLines.entries()) {
        for (const [c, it] of line.items.entries()) {
          if (!['left', 'center', 'right', undefined].includes(it.align)) {
            throw new HttpException(
              `Unknown alignment in row ${r}, col ${c}: ${it.align}`,
              400,
            );
          }
          if (!it.align) it.align = 'left';
          if (it.content === undefined || it.content === null) it.content = '';
          it.content = String(it.content);
        }
      }

      // Zeilen bauen
      const outLines: string[] = [];
      if (hBorders) outLines.push(makeHR());

      for (const row of normalizedLines) {
        const wrapped = row.items.map((it, idx) =>
          wrapText(it.content, charWidths[idx]),
        );
        const rowHeight = wrapped.reduce(
          (m, arr) => Math.max(m, arr.length),
          1,
        );

        for (let ln = 0; ln < rowHeight; ln++) {
          const buffer = new Array<string>(charsPerLine).fill(' ');
          let offset = 0;

          for (let c = 0; c < columns; c++) {
            const width = charWidths[c];
            const start = offset;
            const end = Math.min(start + width, charsPerLine);
            const raw = (wrapped[c][ln] ?? '').slice(
              0,
              Math.max(0, end - start),
            );
            const len = raw.length;

            let insertAt = start;
            const align = row.items[c].align ?? 'left';
            if (align === 'right') insertAt = end - len;
            else if (align === 'center')
              insertAt = start + Math.floor((width - len) / 2);
            insertAt = clamp(insertAt, start, Math.max(start, end - len));

            for (let i = 0; i < len; i++) {
              const pos = insertAt + i;
              if (pos >= start && pos < end) buffer[pos] = raw[i];
            }

            offset = end + (c < columns - 1 ? sepWidth : 0);
            if (offset >= charsPerLine) break;
          }

          const line = buffer.join('').replace(/\s+$/, '');
          outLines.push(line);
        }

        if (hBorders) outLines.push(makeHR());
      }

      const printable = outLines.join('\n');
      const res = await this.print.printText(printable);

      if (table.cut) await this.print.cutReceipt();

      release();
      return res;
    } catch (err) {
      release();
      throw err;
    }
  }
}
