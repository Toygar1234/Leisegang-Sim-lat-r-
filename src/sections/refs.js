/**
 * 09 · KAYNAKLAR, SÖZLÜK VE MÜFREDAT
 */
import { SOURCES, GLOSSARY, CURRICULUM } from "../data/content.js";

export function initRefs() {
  const root = document.getElementById("refs");
  root.innerHTML = `
    <div class="glass refs__box"><h3>Kaynakça</h3><ol class="refs__list">${SOURCES.map((s) => `<li>${s}</li>`).join("")}</ol></div>
    <div class="glass refs__box"><h3>Sözlük</h3>
      <div class="gloss"><input type="search" id="glossQ" placeholder="Bir kavram ara… (ör. difüzyon)" aria-label="Sözlükte ara">
      <div id="glossRows">${GLOSSARY.map(([tr, en, d]) => `<div class="gloss__row"><div><b>${tr}</b><i>${en}</i></div><span>${d}</span></div>`).join("")}</div></div></div>
    <div class="glass curr"><h3 class="h3" style="margin-top:0">Maarif Modeli kazanımlarıyla bağlantı</h3>
      <div class="curr__grid">${CURRICULUM.map((c) => `<div class="curr__item"><b>${c.k}</b><p><strong>${c.t}</strong></p><p>${c.p}</p></div>`).join("")}</div></div>`;
  const q = root.querySelector("#glossQ"), rows = [...root.querySelectorAll(".gloss__row")];
  q.addEventListener("input", () => {
    const v = q.value.toLocaleLowerCase("tr-TR").trim();
    rows.forEach((r) => { r.style.display = !v || r.textContent.toLocaleLowerCase("tr-TR").includes(v) ? "" : "none"; });
  });
}
