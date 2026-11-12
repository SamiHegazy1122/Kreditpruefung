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
  constructor(empfohlen, kennzahlen, begruendung, schritte, monatsrate) {
    this.empfohlen = empfohlen;
    this.kennzahlen = kennzahlen;
    this.begruendung = begruendung;   // string[]
    this.schritte = schritte;         // string[]
    this.monatsrate = monatsrate;     // number | null
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
