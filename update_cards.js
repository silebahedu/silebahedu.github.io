const fs = require('fs');
const file = 'c:/Users/User/Desktop/APLIKASI LOMBA/inklusi.html';
let content = fs.readFileSync(file, 'utf8');

const cardsData = [
    {
        oldName: 'Ahli Psikologi',
        newName: 'Robik Anwar Dani, M.Psi.',
        role: 'Ahli Psikologi',
        phone: '+6281288885872',
        wa: '6281288885872',
        region: ''
    },
    {
        oldName: 'Ahli Terapi',
        newName: 'Fudak Winduko, SH., M.Pd.',
        role: 'Guru Pendamping Khusus',
        phone: '+6282266452216',
        wa: '6282266452216',
        region: 'Kecamatan Wonoasri'
    },
    {
        oldName: 'Guru Pendamping',
        newName: 'Martha Febri Tri Marthadiputri, S.Pd.SD. , M.Pd.',
        role: 'Guru Pendamping Khusus',
        phone: '+6281230144945',
        wa: '6281230144945',
        region: 'Kecamatan Dolopo'
    },
    {
        oldName: 'Konselor',
        newName: 'Retno Saraswati, S.Pd. , M.Pd.',
        role: 'Guru Pendamping Khusus',
        phone: '+6281230144945',
        wa: '6281230144945',
        region: 'Kecamatan Pilangkenceng'
    }
];

let currentIndex = 0;
let output = '';

for (const card of cardsData) {
    const dataNameStr = 'data-name="' + card.oldName + '"';
    const cardStartMatch = content.indexOf(dataNameStr, currentIndex);
    if (cardStartMatch === -1) {
        console.error('Could not find card: ' + card.oldName);
        process.exit(1);
    }
    
    // Find the end of the a tag
    const cardEnd = content.indexOf('</a>', cardStartMatch) + 4;
    
    // The part before this card
    const prefix = content.substring(currentIndex, cardStartMatch);
    // The card itself
    let block = content.substring(cardStartMatch, cardEnd);
    
    // Updates
    block = block.replace('data-name="' + card.oldName + '"', 'data-name="' + card.newName + '"');
    
    // href
    block = block.replace(/href="https:\/\/wa\.me\/\d+"/, 'href="https://wa.me/' + card.wa + '"');
    
    // alt text of img
    block = block.replace(/alt="([^"]+)"/, 'alt="' + card.role + '"');
    
    // h3
    block = block.replace(/<h3([^>]*)>([^<]+)<\/h3>/, '<h3$1>' + card.newName + '</h3>');
    
    // The `<p>` that contains the phone
    // We are going to replace ALL `<p` tags inside this block with the new set of paragraphs.
    // Let's replace the first paragraph's start with our new paragraph set, and then remove everything up to `</p>` 
    // Actually, originally there's only one `<p ...>0812-XXXX-XXXX</p>`
    
    // Let's find it securely:
    const pStartMatch = block.match(/<p class="text-slate-500[^>]*>.*?<\/p>/s);
    if (pStartMatch) {
        let newP = '<p class="text-slate-500 dark:text-slate-400 mt-1 mb-1 text-sm font-semibold">' + card.role + '</p>\n';
        if (card.region) {
            newP += '                        <p class="text-slate-500 dark:text-slate-400 mb-1 text-xs">' + card.region + '</p>\n';
        }
        newP += '                        <p class="text-slate-500 dark:text-slate-400 mb-4 text-xs">' + card.phone + '</p>';
        block = block.replace(pStartMatch[0], newP);
    }
    
    output += prefix + block;
    currentIndex = cardEnd;
}

output += content.substring(currentIndex);
fs.writeFileSync(file, output);
console.log('Update Complete');
