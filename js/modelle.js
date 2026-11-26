/* modelle.js - Datenklassen gemaess Klassendiagramm */

class Kreditantrag {
  constructor(typ, einkommen, vermoegen, wohnkosten, bestehendeKredite,
              kreditbetrag, laufzeitMonate, zinssatz, alter) {
    this.typ = typ;                           // "privat" | "unternehmen"
    this.einkommen = einkommen;               // pro Jahr (bzw. Gewinn)
    this.vermoegen = vermoegen;
    this.wohnkosten = wohnkosten;             // pro Monat
    this.bestehendeKredite = bestehendeKredite; // Restschuld
    this.kreditbetrag = kreditbetrag;
    this.laufzeitMonate = laufzeitMonate;
    this.zinssatz = zinssatz;                 // % pro Jahr
    this.alter = alter;                       // nur privat
  }
}

class Pruefergebnis {
  constructor(empfohlen, kennzahlen, begruendung, schritte, monatsrate, tilgungsplan) {
    this.empfohlen = empfohlen;
    this.kennzahlen = kennzahlen;
    this.begruendung = begruendung;   // string[]
    this.schritte = schritte;         // string[]
    this.monatsrate = monatsrate;     // number | null
    this.tilgungsplan = tilgungsplan; // Tilgungszeile[]
  }
}

class Tilgungszeile {
  constructor(monat, rate, zins, tilgung, restschuld) {
    this.monat = monat;             // 1 .. laufzeitMonate
    this.rate = rate;               // Annuitaet (konstant, letzte Rate ggf. kleiner)
    this.zins = zins;               // Zinsanteil dieser Rate
    this.tilgung = tilgung;         // Tilgungsanteil dieser Rate
    this.restschuld = restschuld;   // Restschuld nach dieser Rate
  }
}

class Regel {
  constructor(bezeichnung, kennzahl, operator, grenzwert, giltFuer) {
    this.bezeichnung = bezeichnung;
    this.kennzahl = kennzahl;
    this.operator = operator;   // "<=" | ">="
    this.grenzwert = grenzwert;
    this.giltFuer = giltFuer;   // "privat" | "unternehmen" | "beide"
  }
}
