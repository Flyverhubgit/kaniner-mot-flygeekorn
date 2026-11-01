# Kaniner mot Flygeekorn

Blokkete flerspiller-FPS i nettleseren. Velg lag, skyt det andre laget. 5 minutter per runde.

## Spill hjemme (samme WiFi)
1. Pakk ut zip-filen (høyreklikk → **Pakk ut alle**). Ikke kjør fra inne i zip-filen.
2. Dobbeltklikk **test-locally-windows.bat**.
   - Første gang: installer Node.js (LTS) fra https://nodejs.org hvis den spør.
3. Nettleseren åpner spillet. Vinduet viser adressen andre på samme WiFi skal bruke (f.eks. `http://192.168.1.20:3000`).
4. Trykk **Tillat** hvis Windows-brannmuren spør.

## Spill med venner over internett (Render, gratis)
1. Lag en konto på https://github.com og last opp denne mappen som et nytt repository.
2. Lag en konto på https://render.com → **New** → **Blueprint** → velg repositoryet.
   Render finner `render.yaml` selv.
3. Etter ca. 2 minutter får du en lenke, f.eks. `https://kaniner-mot-flygeekorn.onrender.com`. Del den.
   - Gratisversjonen sover når ingen spiller. Første besøk tar da 30–50 sek.

## Kontroller
| PC | Mobil |
|---|---|
| WASD gå, mus sikte | venstre tommel gå |
| venstre museknapp skyt, R lad om | høyre tommel se |
| mellomrom hopp, Shift løp, C slide | knapper: SKYT, LADE, HOPP, SLIDE |
| 1 / 2 / musehjul = bytt våpen | knapp: BYTT |
| høyre museknapp = kikkertsikte | knapp: SIKTE |
| G = kast granat | knapp: GRANAT |
| hold Q = dukk | knapp: DUKK (av/på) |
| | skyt: dobbelttrykk og hold på høyre side, dra for å sikte |
| hold Tab = poengtavle | |

## Regler
- 100 liv. Kropp 20 skade (5 treff). Midt i hodet = død med én kule.
- Skumfest: stå på toppen av pyramiden, så fylles banen med rosa skum til neste runde. Dukk (hold Q / DUKK-knappen) for å gjemme deg. Granater blåser hull i skummet.
- Dyrekrefter: Kaninen hopper dobbelt så høyt. Flygeekornet svever når du holder inne hopp i lufta.
- Våpen 1: AK, 100 skudd i magasinet. Våpen 2: snikskytter (kaniner: gulrot, flygeekorn: nøtt), 5 skudd, 60 i kroppen, 100 i hodet. Bruk kikkerten – uten den sprer skuddene mye.
- Uendelig reserve-ammo.
- 3 granater per liv. Smeller etter 2 sek, opptil 110 skade innenfor 6 m.
- Ny start etter 3 sek, med full ammo og granater.
- Ingen skade på eget lag.
- Ingen juksebeskyttelse – spill med venner.
