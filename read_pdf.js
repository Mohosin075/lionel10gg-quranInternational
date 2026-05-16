const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('hu_kegyes_Koran_magyar.pdf');

pdf(dataBuffer).then(function(data) {
    // number of pages
    console.log("Num Pages:", data.numpages);
    // PDF info
    console.log("Info:", data.info);
    
    const lines = data.text.split('\n');
    console.log("Total lines:", lines.length);
    
    // log first 500 lines to see the structure
    console.log("First 500 lines:");
    for(let i=0; i<500; i++) {
        if(lines[i]) console.log(lines[i]);
    }
}).catch(function(error){
    console.log("Error:", error);
});
