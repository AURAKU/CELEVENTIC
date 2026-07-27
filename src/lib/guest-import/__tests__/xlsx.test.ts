import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { columnIndexFromRef, decodeXmlText, looksLikeXlsx, parseXlsx } from "../xlsx";
import { parseUploadedFile } from "../parse-source";

/**
 * XLSX reading.
 *
 * The fixtures are real ZIP archives built here rather than checked-in binary
 * blobs, so the test states exactly what shape of workbook it is asserting
 * against — including the two things that break naive readers: shared strings
 * and sparse rows where an empty cell is simply absent from the XML.
 */

interface ZipFile {
  name: string;
  content: string;
  /** Store uncompressed to exercise the method-0 path. */
  stored?: boolean;
}

/** Minimal ZIP writer. CRCs are left zero — the reader never checks them. */
function buildZip(files: ZipFile[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const raw = Buffer.from(file.content, "utf8");
    const method = file.stored ? 0 : 8;
    const data = file.stored ? raw : deflateRawSync(raw);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    locals.push(local, data);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centrals.push(central);

    offset += local.length + data.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

function workbook(sheetXml: string, sharedStrings?: string[]): Buffer {
  const files: ZipFile[] = [
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0"?><workbook><sheets><sheet name="Guests" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      stored: true,
    },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml },
  ];
  if (sharedStrings) {
    files.push({
      name: "xl/sharedStrings.xml",
      content: `<?xml version="1.0"?><sst count="${sharedStrings.length}">${sharedStrings
        .map((s) => `<si><t>${s}</t></si>`)
        .join("")}</sst>`,
    });
  }
  return buildZip(files);
}

describe("decodeXmlText", () => {
  it("decodes named and numeric entities", () => {
    assert.equal(decodeXmlText("Mr &amp; Mrs &#65;sante"), "Mr & Mrs Asante");
    assert.equal(decodeXmlText("&#x41;kua"), "Akua");
  });
});

describe("columnIndexFromRef", () => {
  it("maps spreadsheet columns to zero-based indexes", () => {
    assert.equal(columnIndexFromRef("A1"), 0);
    assert.equal(columnIndexFromRef("C7"), 2);
    assert.equal(columnIndexFromRef("Z1"), 25);
    assert.equal(columnIndexFromRef("AA1"), 26);
    assert.equal(columnIndexFromRef("AB12"), 27);
  });
});

describe("parseXlsx", () => {
  it("reads shared strings and separates the header", () => {
    const buffer = workbook(
      `<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>
        <row r="3"><c r="A3" t="s"><v>4</v></c><c r="B3" t="s"><v>5</v></c></row>
      </sheetData></worksheet>`,
      ["Name", "Email", "Kofi Mensah", "kofi@example.com", "Ama Serwaa", "ama@example.com"]
    );

    const table = parseXlsx(buffer);
    assert.deepEqual(table.headers, ["Name", "Email"]);
    assert.equal(table.rows.length, 2);
    assert.deepEqual(table.rows[0], ["Kofi Mensah", "kofi@example.com"]);
  });

  it("pads a sparse row where the middle cell is absent from the XML", () => {
    const buffer = workbook(
      `<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
        <row r="2"><c r="A2" t="s"><v>3</v></c><c r="C2" t="inlineStr"><is><t>0244123456</t></is></c></row>
      </sheetData></worksheet>`,
      ["Name", "Email", "Phone", "Ama Serwaa"]
    );

    const table = parseXlsx(buffer);
    assert.deepEqual(table.rows[0], ["Ama Serwaa", "", "0244123456"]);
  });

  it("reads a numeric cell verbatim so a stripped leading zero can be recovered", () => {
    const buffer = workbook(
      `<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>244123456</v></c></row>
      </sheetData></worksheet>`,
      ["Name", "Phone", "Kofi Mensah"]
    );

    assert.deepEqual(parseXlsx(buffer).rows[0], ["Kofi Mensah", "244123456"]);
  });

  it("concatenates rich-text runs into one value", () => {
    const buffer = buildZip([
      {
        name: "xl/sharedStrings.xml",
        content: `<sst><si><r><t>Mr &amp; Mrs</t></r><r><t xml:space="preserve"> Boateng</t></r></si></sst>`,
      },
      {
        name: "xl/worksheets/sheet1.xml",
        content: `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>`,
      },
    ]);

    assert.deepEqual(parseXlsx(buffer).rows[0], ["Mr & Mrs Boateng"]);
  });

  it("treats an error cell as blank rather than importing '#REF!'", () => {
    const buffer = workbook(
      `<worksheet><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>Kofi</t></is></c><c r="B1" t="e"><v>#REF!</v></c></row>
      </sheetData></worksheet>`
    );
    assert.deepEqual(parseXlsx(buffer).rows[0], ["Kofi", ""]);
  });

  it("rejects a file that is not a ZIP", () => {
    assert.equal(looksLikeXlsx(Buffer.from("Name,Email\nKofi,k@e.com")), false);
  });
});

describe("parseUploadedFile", () => {
  it("routes an .xlsx by its bytes, not its extension", () => {
    const buffer = workbook(
      `<worksheet><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c></row>
        <row r="2"><c r="A2" t="inlineStr"><is><t>Ama Serwaa</t></is></c></row>
      </sheetData></worksheet>`
    );
    const result = parseUploadedFile(buffer, "guests.csv");
    assert.equal(result.source, "XLSX");
    assert.deepEqual(result.rows[0], ["Ama Serwaa"]);
  });

  it("parses a plain CSV upload", () => {
    const result = parseUploadedFile(Buffer.from("Name,Phone\nKofi,0244123456"), "guests.csv");
    assert.equal(result.source, "CSV");
    assert.deepEqual(result.headers, ["Name", "Phone"]);
  });

  it("refuses a legacy .xls with actionable advice", () => {
    assert.throws(
      () => parseUploadedFile(Buffer.from("some binary-ish text"), "guests.xls"),
      /save as \.xlsx or \.csv/i
    );
  });

  it("refuses an empty file", () => {
    assert.throws(() => parseUploadedFile(Buffer.alloc(0), "guests.csv"), /empty/i);
  });
});
