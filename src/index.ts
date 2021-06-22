import fs from "fs/promises";
import fsextra from "fs-extra";
import sass from "sass";
import ts from "typescript";
import marked from "marked";
import path from "path";
import consola from "consola";
import min from "html-minifier-terser";
import createDomPurify from "dompurify";
import { JSDOM } from "jsdom";

const renderer = {
  code: (code: string, info: string) => {
    if (code.includes("sg!include")) {
      if (info === "js" || info === "javascript") {
        consola.success(
          `Injected ${code.split("\n").length} lines of JavaScript code`
        );
        return `<script>${code}</script>`;
      }
      if (info === "css") {
        consola.success(
          `Injected ${code.split("\n").length} lines of CSS styles`
        );
        // Inject CSS
        return `<style>${code}</style>`;
      }
      if (info === "scss") {
        consola.success(
          `Compiled and injected ${
            code.split("\n").length
          } lines of SCSS styles`
        );
        // Compile and inject SASS
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
        return `<script>${ts.transpile(code)}</script>`;
      }
    }

    return `<code>${code}</code>`;
  },
  image: (href: string, title: string, text: string) => {
    return `<img src="${href}" alt="${text}" title="${title}" decoding="async" loading="lazy">`;
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

    const window = new JSDOM("").window;
    const DOMPurify = createDomPurify(window);
    const compiled = DOMPurify.sanitize(marked(pageContents), {
      ADD_TAGS: ["script", "style"],
    });

    fs.stat(path.join(process.cwd(), "out")).catch(() =>
      fs.mkdir(path.join(process.cwd(), "out"))
    );

    const originalHtml = mainTemplate.replace("{mount}", compiled);

    const minifiedHtml = min.minify(originalHtml, {
      minifyCSS: true,
      minifyJS: true,
      minifyURLs: true,
      removeRedundantAttributes: true,
    });

    fs.writeFile(
      path.join(process.cwd(), "out", page.replace(/\.md$/, ".html")),
      minifiedHtml
    );
    consola.success(`Compiled ${page} to ${page.replace(/\.md$/, ".html")}`);
  }

  const imagesPath = path.join(process.cwd(), "images");
  const imagesOutPath = path.join(process.cwd(), "out", "images");

  if (fsextra.existsSync(imagesPath))
    fsextra
      .copy(imagesPath, imagesOutPath)
      .then(() =>
        consola.success(`Copied all images from images/ to out/images/`)
      )
      .catch(() => consola.error("Error copying images"));

  const publicPath = path.join(process.cwd(), "public");

  if (fsextra.existsSync(publicPath))
    fsextra
      .copy(path.join(process.cwd(), "public"), path.join(process.cwd(), "out"))
      .then(() =>
        consola.success(`Copied all static assets from public/ to out/`)
      )
      .catch(() => consola.error("Error copying static assets"));
}

process.on("uncaughtException", (err) => {
  consola.error(err.message);
});

export default main;
