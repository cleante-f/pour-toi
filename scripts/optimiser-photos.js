// Convertit photos/* en WebP (max 1920 px de large, qualité 75) dans photos-optimized/
// et génère photos-optimized/photos.json. Lancement : npm run photos
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const os = require("os");
const { execFileSync } = require("child_process");

const racine = path.join(__dirname, "..");
const source = path.join(racine, "photos");
const cible = path.join(racine, "photos-optimized");
const extensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".avif"];

async function main() {
  fs.mkdirSync(cible, { recursive: true });
  const fichiers = fs.readdirSync(source)
    .filter((f) => extensions.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));

  const liste = [];
  for (const f of fichiers) {
    const nom = path.parse(f).name.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase() + ".webp";
    const sortie = path.join(cible, nom);
    try {
      let entree = path.join(source, f);
      // sharp ne lit pas le HEIC de l'iPhone : on passe d'abord par l'outil macOS « sips »
      if (/\.hei[cf]$/i.test(f)) {
        const tmp = path.join(os.tmpdir(), "maelys-" + Date.now() + ".jpg");
        execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "90", entree, "--out", tmp], { stdio: "ignore" });
        entree = fs.readFileSync(tmp); fs.unlinkSync(tmp);
      }
      const info = await sharp(entree)
        .rotate() // applique l'orientation EXIF puis la supprime
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(sortie);
      liste.push({ fichier: nom, largeur: info.width, hauteur: info.height, original: f });
      console.log("✓", f, "→", nom);
    } catch (e) {
      console.warn("✗ ignorée :", f, "(" + e.message + ")");
    }
  }
  fs.writeFileSync(path.join(cible, "photos.json"), JSON.stringify(liste, null, 2));
  console.log(`\n${liste.length} photo(s) prêtes dans photos-optimized/ (photos.json mis à jour).`);
}

main();
