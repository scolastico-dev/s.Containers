<template>
  <div class="flex flex-col min-h-screen">
    <div class="grid grid-cols-2">
      <div class="flex items-center">
        <h1 class="text-2xl ml-2">
          {{ path || '' }}
        </h1>
      </div>
      <div class="text-end">
        <select v-model="language">
          <option v-for="(l, i) in languages" :key="i" :value="i">
            {{ i }}
          </option>
        </select>
        <button @click="save">Save</button>
<!--        <button @click="saveAs">Save As</button>-->
        <button @click="$router.push('/')">Cancel</button>
      </div>
    </div>
    <div class="flex-grow bg-zinc-900 cursor-text">
      <codemirror
          v-if="code !== null"
          ref="editor"
          v-model="code"
          placeholder="Config goes here..."
          :autofocus="true"
          :indent-with-tab="true"
          :tab-size="2"
          :extensions="extensions"
      />
    </div>
<!--    <div v-if="askForLocation" class="absolute inset-0 bg-stone-500/50">-->
<!--      <div id="askForLocation">-->
<!--        <input >-->
<!--      </div>-->
<!--    </div>-->
  </div>
</template>

<script>
import {Codemirror} from 'vue-codemirror'
import {javascript as extJavaScript} from "@codemirror/lang-javascript";
import {css as extCss} from "@codemirror/lang-css";
import {html as extHtml} from "@codemirror/lang-html";
import {java as extJava} from "@codemirror/lang-java";
import {json as extJson} from "@codemirror/lang-json";
import {markdown as extMarkdown} from "@codemirror/lang-markdown";
import {php as extPhp} from "@codemirror/lang-php";
import {python as extPython} from "@codemirror/lang-python";
import {rust as extRust} from "@codemirror/lang-rust";
import {sql as extSql} from "@codemirror/lang-sql";
import {xml as extXml} from "@codemirror/lang-xml";
import {StreamLanguage} from "@codemirror/language"
import {lua} from "@codemirror/legacy-modes/mode/lua"
import {yaml} from "@codemirror/legacy-modes/mode/yaml"
import {toml} from "@codemirror/legacy-modes/mode/toml"
import {oneDark as extOneDark} from "@codemirror/theme-one-dark";
import mime from 'mime'

export default {
  components: {Codemirror},
  data: () => ({
    language: 'toml',
    code: null,
    extensions: [],
    path: null,
    // askForLocation: true,
    languages: {
      'javascript': extJavaScript(),
      'css': extCss(),
      'html': extHtml(),
      'java': extJava(),
      'json': extJson(),
      'markdown': extMarkdown(),
      'php': extPhp(),
      'python': extPython(),
      'rust': extRust(),
      'sql': extSql(),
      'xml': extXml(),
      'lua': StreamLanguage.define(lua),
      'yaml': StreamLanguage.define(yaml),
      'toml': StreamLanguage.define(toml),
    },
  }),
  watch: {
    language(newVal) {
      this.setLang(newVal);
    }
  },
  async beforeMount() {
    this.path = this.$route.params.path.join('/').replace(/^!DOT!/, '.');
    if (!this.path.startsWith('./')) this.path = '/' + this.path;
    const file = this.path.split('/').pop()
    const type = mime.getType(file.split('.').pop());
    Object.keys(this.languages).forEach(lang => {
      if (type.includes(lang)) this.language = lang;
    })
    this.setLang(this.language)
    try {
      const {$axios} = useNuxtApp()
      const {data} = await $axios.get('config', {params: {path: this.path}})
      this.code = data.data;
    } catch (e) {
      if (e.response.status === 401) {
        useRouter().push('/login')
      } else console.error(e)
    }
  },
  methods: {
    setLang(lang) {
      this.extensions = [extOneDark, this.languages[lang]];
    },
    save() {
      const {$axios} = useNuxtApp();
      $axios.put('/config', {
        data: this.code,
      }, {
        params: {
          path: this.path,
        }
      }).then(() => {
        useRouter().push('/');
      })
    },
  },
}
</script>

<!--<style>-->
<!--#askForLocation {-->
<!--  @apply fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2;-->
<!--  @apply bg-zinc-800 rounded shadow-2xl p-4;-->
<!--}-->
<!--</style>-->
