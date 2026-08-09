const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '192.168.1.21',
      username: 'root',
      password: '050410',
      tryKeyboard: true,
      readyTimeout: 20000
    });

    const script = `
const db = require('better-sqlite3')('data/spent.db');

const domainMap = [
  { keyword: 'bit', domain: 'bitpay.co.il' },
  { keyword: 'מחסני השוק', domain: 'm-hashuk.co.il' },
  { keyword: 'aliexpress', domain: 'aliexpress.com' },
  { keyword: 'דיינרס', domain: 'diners.co.il' },
  { keyword: 'wolt', domain: 'wolt.com' },
  { keyword: 'פרטנר', domain: 'partner.co.il' },
  { keyword: 'לאומי', domain: 'leumi.co.il' },
  { keyword: 'כלל', domain: 'clalbit.co.il' },
  { keyword: 'apple', domain: 'apple.com' },
  { keyword: 'סיבוס', domain: 'cibus.co.il' },
  { keyword: 'ישראכרט', domain: 'isracard.co.il' },
  { keyword: 'aig', domain: 'aig.co.il' },
  { keyword: 'איי.אי.ג', domain: 'aig.co.il' },
  { keyword: 'סופר פארם', domain: 'super-pharm.co.il' },
  { keyword: '9000000', domain: '9000000.co.il' },
  { keyword: '9 ביטוח', domain: '9000000.co.il' },
  { keyword: 'paybox', domain: 'payboxapp.com' },
  { keyword: 'מכבי', domain: 'maccabi4u.co.il' },
  { keyword: 'מקס', domain: 'max.co.il' },
  { keyword: 'max', domain: 'max.co.il' },
  { keyword: 'כלמוביל', domain: 'colmobil.co.il' },
  { keyword: 'תדיראן', domain: 'tadiran.co.il' },
  { keyword: 'רמי לוי', domain: 'rami-levy.co.il' },
  { keyword: 'פנגו', domain: 'pango.co.il' },
  { keyword: 'איתוראן', domain: 'ituran.com' },
  { keyword: 'netflix', domain: 'netflix.com' },
  { keyword: 'רולדין', domain: 'roladin.co.il' },
  { keyword: 'ביטוח ישיר', domain: '555.co.il' },
  { keyword: 'רנואר', domain: 'renuar.co.il' },
  { keyword: 'דומינו', domain: 'dominos.co.il' },
  { keyword: 'סלקום', domain: 'cellcom.co.il' },
  { keyword: 'דלק', domain: 'delek.co.il' },
  { keyword: 'חברת החשמל', domain: 'iec.co.il' },
  { keyword: 'הום סנטר', domain: 'homecenter.co.il' },
  { keyword: 'ארומה', domain: 'aroma.co.il' },
  { keyword: 'אייס', domain: 'ace.co.il' },
  { keyword: 'פאפא גונס', domain: 'papajohns.co.il' },
  { keyword: 'לנדוור', domain: 'landwercafe.co.il' },
  { keyword: 'onlyfans', domain: 'onlyfans.com' },
  { keyword: 'wizz', domain: 'wizzair.com' },
  { keyword: 'אורבניקה', domain: 'urbanica-israel.co.il' },
  { keyword: 'קפה', domain: 'landwercafe.co.il' } // mostly landwer
];

let updatedCount = 0;

db.transaction(() => {
  for (const { keyword, domain } of domainMap) {
    const res = db.prepare(
      "UPDATE transactions SET merchant_domain = ? WHERE merchant_domain IS NULL AND description LIKE ?"
    ).run(domain, '%' + keyword + '%');
    updatedCount += res.changes;
  }
})();

console.log("Successfully updated " + updatedCount + " transactions with domains!");
`;
    
    // Write the script to the remote server and run it via docker exec node
    await ssh.execCommand(`cat << 'EOF' > /DATA/AppData/spent/data/backfill-domains.js\n${script}\nEOF`);
    const res = await ssh.execCommand(`docker exec spent node data/backfill-domains.js`);
    
    console.log(res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);

    process.exit(0);
  } catch (err) {
    console.error("SSH Error:", err);
    process.exit(1);
  }
}

run();
