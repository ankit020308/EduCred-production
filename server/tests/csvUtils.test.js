const { sanitizeCSVCell, quoteCSVCell } = await import('../../client/src/utils/csv.js');

describe('CSV export sanitisation', () => {
  it.each(['=CMD()', '+HYPERLINK("x")', '-10+20', '@SUM(1,2)', '\t=1+1', '\r=1+1'])(
    'prefixes formula-like value %p with a tab',
    (value) => {
      expect(sanitizeCSVCell(value)).toBe(`\t${value}`);
    }
  );

  it('quotes cells after formula sanitisation and escapes embedded quotes', () => {
    expect(quoteCSVCell('=HYPERLINK("https://evil.test")')).toBe('"\t=HYPERLINK(""https://evil.test"")"');
  });

  it('leaves ordinary values untouched before quoting', () => {
    expect(quoteCSVCell('CERT-123')).toBe('"CERT-123"');
  });
});
