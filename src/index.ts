import fs from "fs/promises";
import fsextra from "fs-extra";
import sass from "sass";
import ts from "typescript";
import marked from "marked";
import path from "path";
import consola from "consola";
import uglify from "uglify-js";

function min(code: string): string {
  const uglified = uglify.minify(code, { sourceMap: true });
  if (uglified.error) {
    consola.error(`Error minifying code; it will be added unmodified.`);
    consola.error(`Error: ${uglified.error}`);
    return code;
  }
  consola.success(`Minified ${code.split("\n").length} lines of code`);
  return `${code}`;
}

const html = String.raw;

const renderer = {
  code: (code: string, info: string) => {
    if (code.includes("stockgen!include")) {
      if (info === "js" || info === "javascript") {
        consola.success(
          `Injected ${code.split("\n").length} lines of JavaScript code`
        );
        return `<script>${min(code)}</script>`;
      }
      if (info === "css") {
        consola.success(
          `Injected ${code.split("\n").length} lines of CSS styles`
        );
        return `<style>${code}</script>`;
      }
      if (info === "scss") {
        consola.success(
          `Compiled and injected ${
            code.split("\n").length
          } lines of SCSS styles`
        );
        return `<style>${sass
          .renderSync({ data: code })
          .css.toString()}</style>`;
      }
      if (info === "ts" || info === "typescript") {
        consola.success(
          `Compiled and injected ${
            code.split("\n").length
          } lines of TypeScript code`
        );
        return `<script>${min(ts.transpile(code))}</script>`;
      }
    }

    return `<code>${code}</code>`;
  },
  image: (href: string, title: string, text: string) => {
    return html`<img
      src="${href}"
      alt="${text}"
      title="${title}"
      decoding="async"
      loading="lazy"
    />`;
  },
};

async function main() {
  marked.use({ renderer });

  const mainTemplate = (
    await fs
      .readFile(path.join(process.cwd(), "template", "index.html"))
      .catch((ex) => {
        consola.error(ex);
        consola.error("Create template/index.html!");
        process.exit();
      })
  ).toString();

  if (!mainTemplate.includes("{mount}")) {
    consola.warn("{mount} not found");
  }

  const pagesDir = await fs
    .readdir(path.join(process.cwd(), "pages"))
    .catch(() => {
      consola.error("Error reading `pages` directory. Does it exist?");
      process.exit();
    });

  for (const page of pagesDir) {
    const pageContents = (
      await fs.readFile(path.join(process.cwd(), "pages", page))
    ).toString();
    const compiled = marked(pageContents);
    fs.stat(path.join(process.cwd(), "out")).catch(() =>
      fs.mkdir(path.join(process.cwd(), "out"))
    );
    fs.writeFile(
      path.join(process.cwd(), "out", page.replace(/\.md$/, ".html")),
      mainTemplate.replace("{mount}", compiled)
    );
    consola.success(`Compiled ${page} to ${page.replace(/\.md$/, ".html")}`);
  }

  fsextra
    .copy(
      path.join(process.cwd(), "images"),
      path.join(process.cwd(), "out", "images")
    )
    .then(() =>
      consola.success(`Copied all images from images/ to out/images/`)
    )
    .catch(() => consola.error("Error copying images"));

  fsextra
    .copy(path.join(process.cwd(), "public"), path.join(process.cwd(), "out"))
    .then(() =>
      consola.success(`Copied all static assets from public/ to out/`)
    )
    .catch(() => consola.error("Error copying static assets"));
}

process.on("uncaughtException", (err) => {
  consola.error(err.message);
  consola.error(err.stack);
  consola.error(err.name);
});

export default main;
