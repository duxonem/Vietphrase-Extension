let tmpDicts = { Options: {} };
let tmpOptions = tmpDicts.Options;
function optionChange(t) {
    if (t.target.type == 'checkbox') tmpOptions[t.target.id] = t.target.checked;
    else tmpOptions[t.target.id] = t.value;
}

function readDict(e) {
    e.target.files[0].text().then(data => {
        switch (e.target.id) {
            case 'inFilePhienAm': rawToDict(data).then(dict => tmpDicts['PhienAm'] = dict).catch(ee => console.log(ee)); break;
            case 'inFileNames': rawToDict(data).then(dict => tmpDicts['Names'] = dict).catch(ee => console.log(ee)); break;
            case 'inFileVP': rawToDict(data).then(dict => tmpDicts['VP'] = dict).catch(ee => console.log(ee)); break;
            case 'inFileStrucPhrase': rawToDict(data, sortStruc).then(dict => tmpDicts['SP'] = dict).catch(ee => console.log(ee)); break;
            default: throw new Error('No dict at that name');
        }
    })
}

function rawToDict(raw, sortCallback) {
    return new Promise((resolve, reject) => {
        let lines = String(raw).trim().split('\n');
        let resultDict = { Han: [], HanViet: {} };

        for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].startsWith('//') || lines[i].startsWith('#')) continue; //Skip comment line
            HanViet = lines[i].split('=');
            if (HanViet.length != 2) continue;  //dinh dang sai hoac chua doc len het
            HanViet[0] = HanViet[0].trim();
            HanViet[1] = HanViet[1].trim();
            if (HanViet[0] == '') continue;
            resultDict.HanViet[HanViet[0]] = HanViet[1];
        }
        resultDict.Han = [...new Set(Object.keys(resultDict.HanViet))];
        if (typeof sortCallback === 'function') resultDict.Han.sort(sortCallback);
        else resultDict.Han.sort((b, a) => a.length - b.length || a.localeCompare(b));

        if (resultDict.Han.length > 0) resolve(resultDict);
        else reject('Error: Nodata');
    });
}

function sortStruc(b, a) {
    const reg = /{\d+}|{N\d?}|{V\d?}/g
    const arrA = a.match(reg);
    const arrB = b.match(reg);
    if (arrA.length > arrB.length) return 1;
    if (arrA.length < arrB.length) return -1;

    let a1 = a2 = b1 = b2 = 0;
    if (arrA[0].includes('N')) a1 += 2;
    if (arrA[0].includes('V')) a1 += 1;
    if (arrA.at(-1).includes('N')) a2 += 2;
    if (arrA.at(-1).includes('V')) a2 += 1;

    if (arrB[0].includes('N')) b1 += 2;
    if (arrB[0].includes('V')) b1 += 1;
    if (arrB.at(-1).includes('N')) b2 += 2;
    if (arrB.at(-1).includes('V')) b2 += 1;

    if (a1 + a2 > b1 + b2) return 1;
    if (a1 + a2 < b1 + b2) return -1;

    return a.length - b.length;
}

function $(e) { return e ? document.getElementById(e) || document.querySelector(e) : false };

const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
function firstRun() {
    let request = indexedDB.open("QTlikedWebExt", 1);

    request.onupgradeneeded = () => {
        let dbase = request.result;
        if (!dbase.objectStoreNames.contains("dataStore"))
            dbase.createObjectStore("dataStore", { keyPath: 'name' });
        // dbase.close();
    }
    request.onsuccess = () => {
        let dbase = request.result;
        if (!dbase.objectStoreNames.contains("dataStore"))
            dbase.createObjectStore("dataStore", { keyPath: 'name' });
        console.log('connect database successed');
        dbase.close();
    }
    request.onerror = function (e) { console.log('Loi ', e.target.error); dbase.close(); }
}

function optionsToPage() {
    if (tmpOptions) {
        Object.keys(tmpOptions).forEach(option => {
        if ($(option).tagName == 'TEXTAREA') $(option).value = tmpOptions[option]; else
            if ($(option).type == 'checkbox') $(option).checked = tmpOptions[option];
            else $(option).value = tmpOptions[option];
        })
        if (!tmpOptions['optionLastSavedTime']) tmpOptions['optionLastSavedTime'] = new Date();
    }
}

function loadOptions() {
    const request = indexedDB.open("QTlikedWebExt", 1);
    request.onsuccess = () => {
        dbase = request.result;
        if (dbase.objectStoreNames.contains("dataStore"))
            dbase.transaction('dataStore').objectStore('dataStore').get('Options').onsuccess = function (e) {
                if (e.target.result != undefined) {
                    tmpDicts[e.target.result.name] = JSON.parse(e.target.result.data); //dict.name='Options'; 
                    tmpOptions = tmpDicts.Options;
                    optionsToPage();
                    return true;
                } else return false;
            }
        dbase.close();
    }
}

function saveData() {
    const request = indexedDB.open("QTlikedWebExt", 1);
    document.querySelectorAll('.Options').forEach((el) => {
    if (el.tagName == "TEXTAREA") tmpOptions[el.id] = el.value; else
        if (el.type == 'checkbox') tmpOptions[el.id] = el.checked; else tmpOptions[el.id] = el.value;
    });

    let count = 0;
    request.onsuccess = () => {
        dbase = request.result;
        let dickNames = Object.keys(tmpDicts);
        dickNames.forEach(dictName => {
            count++;
            dbase.transaction('dataStore', 'readwrite').objectStore('dataStore').put({ name: dictName, data: JSON.stringify(tmpDicts[dictName]) }).onsuccess = function (e) {
                if (dictName == 'Names') chrome.storage.local.remove('dictNames');
                if (dictName == 'VP') chrome.storage.local.remove('dictVP');
                console.log(`save ${dictName} successfuly`);
                count--;
            }
        });

        let timeout;
        waitToFinishSaving(100);

        function waitToFinishSaving(delay) {
            clearTimeout(timeout);
            if (count == 0) {
                dbase.close();
                chrome.runtime.sendMessage({ 'action': 'loadData', 'payload': '' })  //Cap nhat Dicts cura background
                window.close();
            } else timeout = setTimeout(waitToFinishSaving, delay)
        }
    }
}

//document.querySelectorAll(".Options").forEach(t => t.addEventListener('change', optionChange));
document.querySelectorAll("input[type='file']").forEach(t => t.addEventListener('change', readDict));
document.querySelector("button").addEventListener('click', saveData);

firstRun();
loadOptions();
