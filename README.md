# Kaniner mot Flygeekorn

Blokkete flerspiller-FPS i nettleseren. Velg lag, skyt det andre laget. 5 minutter per runde.

Fem baner. Den første som kommer inn på en tom server velger banen. Etter hver runde **stemmer** alle på neste bane (12 sekunder, trykk 1/2/3 eller trykk på knappen). Flest stemmer vinner, uavgjort = den som kommer først i rekkefølgen, ingen stemmer = vanlig rekkefølge. Banene: **Tempelet** (med skumfest og hemmelig håndtak), **Kjempe-barnerommet** (stor snikskytterbane med kjempesenger, bok-trapper, alfabetklosser og lego) og **Klosseslottet** (to slott, landsby og trær – ALT kan skytes og sprenges i stykker!). og **Verdensrommet** (moderskip-kamp med jagerfly og laser!).

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
| 1 / 2 / 3 / musehjul = bytt våpen (3 = bazooka) | knapp: BYTT |
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
- Våpen 3: bazooka (kaniner: gulrot-bazooka, flygeekorn: nøtte-kanon). 2 raketter per liv, stort smell, sprenger store hull i klosseslottet.
- Uendelig reserve-ammo (AK og snikskytter).
- Klosseslottet: hvert lag har en MORTER i slottsgården. Gå bort og trykk E (mobil: MORTER). Se opp = lenger, ned = kortere, den røde ringen viser hvor den lander. Skyt! Granaten flyr i 3 sek (fienden ser en oransje varselring), så smeller den og river et stort hull. 5 sek mellom hvert skudd.
- DEN HELLIGE FERSKENEN 🍑 (klosseslottet): svever på toppen av det høye tårnet midt på kartet. Klatre opp stigen (gå inn i den og hold W / fremover – ingen dekning!) og gå inn i ferskenen. Du får 4 sek skjold, og neste granat-kast (G / GRANAT) er ferskenen. Etter 3,5 sek synger koret HALLELUJA, og den sprenger mer enn et halvt slott. En trykkbølge farer utover og dytter folk bort. Den skader ALLE innenfor 20 m – også ditt eget lag! (Bare den som kastet er trygg.) Dør du med den, går den tilbake til tårnet. Ny fersken 60 sek etter smellet.
- VERDENSROMMET 🚀: hvert lag har et moderskip. Du starter i hangaren.
  - Gå til et jagerfly og trykk E (mobil: FLY). Laget har 12 jagerfly per runde – når de er brukt opp, er kanontårnene siste forsvar.
  - Jagerfly: mus = styr, W/S = gass, A/D = sving, Shift eller mellomrom = turbo, skyt = laser, G = torpedo (1 per fly, stor skade på moderskip). Mobil: joysticken er styrespaken (opp = fly opp, ned = fly ned, sideveis = sving), dra på høyre side = sikt, HOPP = turbo, DUKK = sakte, GRANAT = torpedo.
  - Kanontårn: gå til en av de 4 konsollene bakerst i hangaren og trykk E (mobil: KANON). Sikt og skyt fiendens jagerfly. E eller gå = ut. Ødelagte tårn repareres etter 30 sek.
  - Laser biter litt på moderskipet, torpedo biter mye. Sprenger dere fiendens moderskip, vinner dere runden! Er tiden ute, vinner skipet med mest liv igjen.
  - Ikke fly inn i asteroider eller skip – da krasjer du.
- ZOMBIE-KYLLINGER 🐔🧟 (kyllingfarmen, om natta): ALLE spillerne sammen mot kyllingene.
  - Dere starter i kampsenteret midt på gården (Hesco-murer, sandsekker, piggtråd, containere, vakttårn). Alt kan sprenges – også av dere selv!
  - 10 bølger. Kyllingene kryper opp av kirkegårdene i hjørnene og hakker seg gjennom alt som står i veien. Står du høyt, hakker de i bakken under deg.
  - Typer: vanlige (vakler), løpere (raske), eggkastere (råtne egg), eksplosive (smeller) og KONG KLUKK (sjefen, bølge 5 og 10).
  - UENDELIG med ammo: AK og snikskytter trenger aldri å lade om, uendelig med granater og raketter (bazookaen lader fortsatt om). Døde kommer tilbake i pausen. Alle døde = kyllingene vinner. Klar alle 10 = gården er reddet!
  - Røde tønner smeller i kjedereaksjon. Høy, mais og telt tar fyr og brenner. Gullegg = eggmaskingevær i 20 sek.
  - Stiger på tårn, containere, portbroer, låve, våningshus og silo (W = opp, S = ned). Piggtråd gir halv fart.
  - BULLDOSER-TANKEN 🚜 (2 spillere): gå til doseren i leiren og trykk E (mobil: DOSER). Første blir sjåfør (W/A/S/D), andre styrer kanonen (sikt + skyt). Bladet kjører over kyllinger og rett gjennom mais, gjerder, høy og sandsekker. Kyllingene hakker på doseren – blir den ødelagt, faller dere ut. Repareres etter hver bølge.
  - A-10 LUFTSTØTTE ✈️: radioen oppe i vakttårnet. 3 spillere må stå ved radioen (eller alle som lever, hvis dere er færre). Trykk E (mobil: RADIO), sikt – den røde streken går dit du ser – og skyt. BRRRRRT! 40 mm eksplosive granater i et 60 m langt og bredt belte – sprenger murer, dreper kyllinger og tenner på høy. Én per bølge.
  - HEMMELIG 🤫: inne i våningshuset står et bord med to store knapper (IKKE TRYKK!). Men den ekte knappen er et annet sted… (tips: dukk!)
  - Moro: stor hane galer KYKELIKYYY før hver bølge, fjærhauger blir liggende der kyllinger dør, morsom statistikk etter runden (flest kyllinger, mest egget, flest flate kyllinger, flest tønner, sprengte mest av sin egen leir, døde mest) og morsomme dødsmeldinger.
- 3 granater per liv. Smeller etter 2 sek, opptil 110 skade innenfor 6 m.
- HEMMELIG: Et lite gyllent håndtak henger i venstre hus i tempelet. Dra i det (E / TREKK) og alle faller ned i lava-doen! Alle blir zombier, lava deler lagene (lava = død), to broer går over, og granatene er uendelige. Dra i det gylne skyll-håndtaket på deres side for å skylle alle opp igjen (ellers: tilbake ved neste runde).
- Drap på rad: 3 = KILLINGSPREE!, 5 = USTOPPELIG!, 10 = LEGENDARISK!
- Skjold i 2 sek etter ny start (blå boble) – forsvinner hvis du skyter.
- Rød kile ved kanten av skjermen viser hvor du blir skutt fra.
- Ny start etter 3 sek, med full ammo og granater.
- Ingen skade på eget lag (unntatt den hellige ferskenen).
- Fyrverkeri når et lag vinner (og når gården er reddet). "Pop" når du treffer i hodet.
- Ingen juksebeskyttelse – spill med venner.
