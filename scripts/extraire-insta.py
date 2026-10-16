"""Extrait la conversation Instagram avec Maelys (Insta/message_*.html) vers data/insta.json.
Lancement : python3 scripts/extraire-insta.py
- garde les messages jusqu'au 10 mars 2026 inclus ;
- retire ceux qui parlent de Florine et les messages intimes ;
- marque comme « beaux » ceux qui ont assez de sens pour le tirage au hasard.
"""
import glob, json, os, re
from datetime import datetime
from html.parser import HTMLParser
from zoneinfo import ZoneInfo

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN = datetime(2026, 3, 10, 23, 59, tzinfo=ZoneInfo("Europe/Paris"))
# L'export Instagram affiche les heures en heure du Pacifique (vérifié dans l'en-tête de chats.html)
TZ_EXPORT, TZ_PARIS = ZoneInfo("America/Los_Angeles"), ZoneInfo("Europe/Paris")

# Florine, et les façons de parler d'elle avant mars 2026 (« ta meuf », « ma copine »…)
EXCLUS = re.compile(r"flo(rine)?\b|\b(ta|ma|sa) (meuf|copine|go|girlfriend|gf|chérie|nana)\b|\b(mon|ton|son) ex\b|\bvotre couple\b", re.I)
INTIME = re.compile(r"\b(seins?|nichons?|sexe|sexy|baise[rsz]?|bais[ée]|nue?s?|cul|bite|chatte|suce[rsz]?|sucer|jouir|orgasme|excit\w*|l[ée]ch\w*|string|capote|pr[ée]lis?|pr[ée]liminaires?|g[ée]mi\w*|d[ée]shabill\w*|fesses?|tétons?|hot|horny|coquin\w*|lingerie|culotte|soutif|sperme|levrette|pipe|branle\w*|mouill\w*|bander|bandé|dur pour toi|dérape)\b", re.I)
SYSTEME = re.compile(r"(started an? (audio|video) call|call ended|missed (an? )?(audio|video) call|set (the|your) nickname|changed the theme|^maelys\.rchrd$|instagram\.com/)|^(liked a message|reacted |a aimé|a réagi|you sent|vous avez envoyé|.* sent an attachment|.* a envoyé une pièce jointe|this message was unsent|ce message a été retiré|\[média\]$|https?://)", re.I)
FADE = re.compile(r"^(ok(ay)?|oui|non|mdr+|ptdr+|lol+|ah+|oh+|ouais|d'?accord|dac|grave|trop|carrément|vrai|bah|bon|haha+|hihi+|ui|nn|jsp|bref|merci|stp|tkt|ça marche|vas-y|ah bon|c'est vrai|of course|yes|nan)[\s!?.…]*$", re.I)

class Lecteur(HTMLParser):
    def __init__(self):
        super().__init__(); self.m = []; self.cur = None; self.mode = None
    def handle_starttag(self, tag, attrs):
        c = dict(attrs).get("class", "")
        if "pam _3-95" in c: self.cur = {"de": "", "txt": [], "date": ""}; self.m.append(self.cur)
        elif self.cur is not None and "_a6-h" in c: self.mode = "de"
        elif self.cur is not None and "_a6-p" in c: self.mode = "txt"
        elif self.cur is not None and "_a6-o" in c: self.mode = "date"
        if tag in ("img", "video", "audio") and self.cur is not None and self.mode == "txt": self.cur["txt"].append("[média]")
    def handle_endtag(self, tag):
        if tag == "h2" and self.mode == "de": self.mode = None
    def handle_data(self, d):
        if self.cur is None or not self.mode: return
        if self.mode == "de": self.cur["de"] += d
        elif self.mode == "txt": self.cur["txt"].append(d)
        else: self.cur["date"] += d; self.mode = None

def beau(t):
    mots = re.findall(r"\w+", t)
    if "http" in t or FADE.match(t) or re.search(r"bourso", t, re.I): return False
    return len(t) >= 45 and len(mots) >= 9

def main():
    brut = []
    for f in sorted(glob.glob(os.path.join(RACINE, "Insta", "message_*.html"))):
        l = Lecteur(); l.feed(open(f, encoding="utf-8").read()); brut += l.m
    msgs, stats = [], {"total": len(brut), "apres_date": 0, "florine": 0, "intime": 0, "systeme": 0}
    for m in brut:
        txt = re.sub(r"\s+", " ", " ".join(x.strip() for x in m["txt"] if x.strip())).strip()
        # retire les réactions collées au texte (« ❤Maelys.rchrd »), « (edited) » et les dates entre parenthèses
        txt = re.sub(r"\s*\([A-Z][a-z]{2} \d{1,2}, \d{4} [^)]*\)", "", txt)
        txt = re.sub(r"\s*\(edited\)", "", txt)
        txt = re.sub(r"\s*(\S{1,4}(Maelys\.rchrd|Cléante))+$", "", txt).strip()
        try:
            d = datetime.strptime(m["date"].strip(), "%b %d, %Y %I:%M %p").replace(tzinfo=TZ_EXPORT).astimezone(TZ_PARIS)
        except ValueError:
            continue
        if d > FIN: stats["apres_date"] += 1; continue
        if not txt or SYSTEME.search(txt): stats["systeme"] += 1; continue
        if EXCLUS.search(txt): stats["florine"] += 1; continue
        if INTIME.search(txt): stats["intime"] += 1; continue
        msgs.append((d, 0 if m["de"].startswith("Maelys") else 1, txt))
    msgs.sort(key=lambda x: x[0])
    sortie = {
        "noms": ["Maelys", "Cléante"],
        "m": [[d.strftime("%Y-%m-%dT%H:%M"), qui, t] for d, qui, t in msgs],
        "beaux": [i for i, (_, _, t) in enumerate(msgs) if beau(t)],
    }
    json.dump(sortie, open(os.path.join(RACINE, "data", "insta.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    stats.update(gardes=len(msgs), beaux=len(sortie["beaux"]), premier=sortie["m"][0][0] if msgs else None, dernier=sortie["m"][-1][0] if msgs else None)
    print(stats)

main()
