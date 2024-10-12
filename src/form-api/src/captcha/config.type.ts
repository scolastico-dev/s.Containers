/**
 * CaptchaConfig class for configuring CAPTCHA generation.
 */
export class CaptchaConfig {
  /**
   * Background color type: 'distinguishable' or 'random'.
   * @type {string}
   * @default 'distinguishable'
   */
  public backgroundColorType = 'distinguishable';

  /**
   * Text color type: 'distinguishable', 'random', 'randomDifferentFromBackground'.
   * @type {string}
   * @default 'randomDifferentFromBackground'
   */
  public textColorType = 'randomDifferentFromBackground';

  /**
   * Whether to apply distortion to the CAPTCHA.
   * @type {boolean}
   * @default true
   */
  public applyDistortion = true;

  /**
   * Level of distortion applied to the CAPTCHA image.
   * @type {number}
   * @default 1.0
   */
  public distortionLevel = 1.0;

  /**
   * Multiplier for the number of artifacts (lines and dots).
   * @type {number}
   * @default 1.5
   */
  public artifactsMultiplier = 1.5;

  /**
   * Whether to use minimal artifacts.
   * @type {boolean}
   * @default false
   */
  public minimalArtifacts = false;

  /**
   * Whether at least one character should be near the background color.
   * @type {boolean}
   * @default false
   */
  public oneCharacterNearBackground = false;

  /**
   * Rotation range for characters in radians.
   * @type {number}
   * @default 0.15
   */
  public rotationRange = 0.15;

  /**
   * Minimum font size for characters.
   * @type {number}
   * @default 30
   */
  public fontSizeMin = 30;

  /**
   * Maximum font size for characters.
   * @type {number}
   * @default 34
   */
  public fontSizeMax = 34;

  /**
   * Number of characters in the CAPTCHA.
   * @type {number}
   * @default 6
   */
  public characterCount = 6;

  /**
   * Whether to use random fonts.
   * @type {boolean}
   * @default true
   */
  public useRandomFonts = true;

  /**
   * List of fonts to use.
   * @type {string[]}
   * @default ['Arial', 'Comic Sans MS']
   */
  public fonts: string[] = ['Arial', 'Comic Sans MS'];

  /**
   * List of font URLs to download and use, with optional font family names.
   * @type {{ url: string; family?: string }[]}
   * @default []
   */
  public fontUrls: { url: string; family?: string }[] = [];

  /**
   * Character set used to generate the CAPTCHA text.
   * @type {string}
   * @default 'ABCDEFGHJKLMNPRSTUVWXYZ123456789'
   */
  public charset = 'ABCDEFGHJKLMNPRSTUVWXYZ123456789';

  constructor(configString?: string) {
    if (configString) {
      const prefix = `CFG_${configString}_CAPTCHA_`;

      const env = process.env;

      this.backgroundColorType =
        env[`${prefix}BACKGROUND_COLOR_TYPE`] || this.backgroundColorType;

      this.textColorType =
        env[`${prefix}TEXT_COLOR_TYPE`] || this.textColorType;

      const applyDistortionEnv = env[`${prefix}APPLY_DISTORTION`];
      if (applyDistortionEnv !== undefined) {
        this.applyDistortion = applyDistortionEnv.toLowerCase() === 'true';
      }

      const distortionLevelEnv = env[`${prefix}DISTORTION_LEVEL`];
      if (distortionLevelEnv !== undefined) {
        const parsedValue = parseFloat(distortionLevelEnv);
        if (!isNaN(parsedValue)) {
          this.distortionLevel = parsedValue;
        }
      }

      const artifactsMultiplierEnv = env[`${prefix}ARTIFACTS_MULTIPLIER`];
      if (artifactsMultiplierEnv !== undefined) {
        const parsedValue = parseFloat(artifactsMultiplierEnv);
        if (!isNaN(parsedValue)) {
          this.artifactsMultiplier = parsedValue;
        }
      }

      const minimalArtifactsEnv = env[`${prefix}MINIMAL_ARTIFACTS`];
      if (minimalArtifactsEnv !== undefined) {
        this.minimalArtifacts = minimalArtifactsEnv.toLowerCase() === 'true';
      }

      const oneCharacterNearBackgroundEnv =
        env[`${prefix}ONE_CHARACTER_NEAR_BACKGROUND`];
      if (oneCharacterNearBackgroundEnv !== undefined) {
        this.oneCharacterNearBackground =
          oneCharacterNearBackgroundEnv.toLowerCase() === 'true';
      }

      const rotationRangeEnv = env[`${prefix}ROTATION_RANGE`];
      if (rotationRangeEnv !== undefined) {
        const parsedValue = parseFloat(rotationRangeEnv);
        if (!isNaN(parsedValue)) {
          this.rotationRange = parsedValue;
        }
      }

      const fontSizeMinEnv = env[`${prefix}FONT_SIZE_MIN`];
      if (fontSizeMinEnv !== undefined) {
        const parsedValue = parseInt(fontSizeMinEnv, 10);
        if (!isNaN(parsedValue)) {
          this.fontSizeMin = parsedValue;
        }
      }

      const fontSizeMaxEnv = env[`${prefix}FONT_SIZE_MAX`];
      if (fontSizeMaxEnv !== undefined) {
        const parsedValue = parseInt(fontSizeMaxEnv, 10);
        if (!isNaN(parsedValue)) {
          this.fontSizeMax = parsedValue;
        }
      }

      const characterCountEnv = env[`${prefix}CHARACTER_COUNT`];
      if (characterCountEnv !== undefined) {
        const parsedValue = parseInt(characterCountEnv, 10);
        if (!isNaN(parsedValue)) {
          this.characterCount = parsedValue;
        }
      }

      const useRandomFontsEnv = env[`${prefix}USE_RANDOM_FONTS`];
      if (useRandomFontsEnv !== undefined) {
        this.useRandomFonts = useRandomFontsEnv.toLowerCase() === 'true';
      }

      const fontsEnv = env[`${prefix}FONTS`];
      if (fontsEnv !== undefined) {
        this.fonts = fontsEnv.split(',');
      }

      const fontUrlsEnv = env[`${prefix}FONT_URLS`];
      if (fontUrlsEnv !== undefined) {
        const fontUrlEntries = fontUrlsEnv.split(',');
        for (const entry of fontUrlEntries) {
          const [url, family] = entry.split('|');
          if (url) {
            this.fontUrls.push({
              url: url.trim(),
              family: family ? family.trim() : undefined,
            });
          }
        }
      }

      const charsetEnv = env[`${prefix}CHARSET`];
      if (charsetEnv !== undefined) {
        this.charset = charsetEnv;
      }
    }
  }
}
