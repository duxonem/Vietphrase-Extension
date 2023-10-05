let dictPhienAm, dictNames, dictVP, dictSP;
let Options;

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let payload;
    switch (message.action) {
        case 'translate': payload = translate(message.payload); break;
        case 'loadData': { loadData().then(() => { updateContextMenus(); syncWithUnsavedDicts() }); payload = ''; return; }
        case 'loadOptions': loadOptions().then(() => {
            updateContextMenus();
            payload = Options;
            sendResponse({ 'action': message.action, 'payload': payload });
        });
            return true;

        case 'from Edit page with love': (() => {
            if (message.payload.dict == 'Names') {
                dictNames.HanViet[message.payload.orgText] = message.payload.transText;
                dictNames.Han.push(message.payload.orgText);
                dictNames.Han.sort((a, b) => b.length - a.length || a.localeCompare(b));
            }
            if (message.payload.dict == 'VP') {
                dictVP.HanViet[message.payload.orgText] = message.payload.transText;
                dictVP.Han.push(message.payload.orgText);
                dictVP.Han.sort((a, b) => b.length - a.length || a.localeCompare(b));
            }
        })(); payload = ''; break;// return true;

        case 'from Edit page with hate': (() => {
            if (message.payload.dict == 'Names') {
                delete dictNames.HanViet[message.payload.orgText];
                dictNames.Han.splice(dictNames.Han.indexOf(message.payload.orgText), 1);
            }
            if (message.payload.dict == 'VP') {
                delete dictVP.HanViet[message.payload.orgText];
                dictVP.Han.splice(dictVP.Han.indexOf(message.payload.orgText), 1);
            }
        })(); payload = ''; break; //return true;

        case 'exportDicts': exportDicts(); return true;

        default: { }
    }
    sendResponse({ 'action': message.action, 'payload': payload });

    let timeToCheck;   //Hon 5p khong lam gi kiem tra thoi gian exportDicts 1  lan
    clearTimeout(timeToCheck);
    timeToCheck = setTimeout(autoSaveDicts, 10 * 60 * 1000); //10p
    return true;
});


function translate(text) {
    let result;
    if (Options.optionSp) result = VPTrans(strucTrans(text, Options.optionSpNgoac), Options.optionNgoac, Options.optionMotnghia, Options.optionDaucach, Options.optionXoaDich);
    else result = VPTrans(text, Options.optionNgoac, Options.optionMotnghia, Options.optionDaucach, Options.optionXoaDich);
    return result;
}

function VPTrans(text, Ngoac = true, Motnghia = false, Daucach = ';', XoaDich = false) {
    if (dictNames == undefined) dictNames = { Han: [], HanViet: {} };
    if (dictVP == undefined) dictVP = { Han: [], HanViet: {} };
    if (dictPhienAm == undefined) dictPhienAm = { Han: [], HanViet: {} };
    const DichLieuTru = ['的', '了', '著'];
    dictNames.Han.forEach(Han => text = text.replaceAll(Han, ` ${dictNames.HanViet[Han]}`));
    dictVP.Han.forEach((Han) => {
        let VP = dictVP.HanViet[Han];
        if (Motnghia) VP = dictVP.HanViet[Han].split(Daucach)[0];
        if (Ngoac) VP = `[${VP}]`;
        text = text.replaceAll(Han, ` ${VP}`)
    });

    if (XoaDich) DichLieuTru.forEach(dich => text = text.replaceAll(dich, ''));

    dictPhienAm.Han.forEach(Han => text = text.replaceAll(Han, ` ${dictPhienAm.HanViet[Han]}`));
    text = text.replaceAll(/(\s+)/g, ' ').trim();
    return text;
}

function strucTrans(text, Ngoac = true) {
    if (dictNames == undefined) dictNames = { Han: [], HanViet: {} };
    if (dictVP == undefined) dictVP = { Han: [], HanViet: {} };
    if (dictSP == undefined) dictSP = { Han: [], HanViet: {} };
    const maxLength = Math.max(dictNames.Han[0].length, dictVP.Han[0].length); //Han[0] is the longest phrase
    let reg = /{\d+}|{N\d?}|{V\d?}/g

    dictSP.Han.forEach(SP => {
        let searchEl = SP.match(reg); //match {0}, {V} by order in cText
        let strReg = SP.replace(reg, '([\\p{sc=Han}0-9]+)'); //cText = abc{1}def{0}ijk{ V } => lmn([\\p{sc=Han}0-9]+)opq([\\p{sc=Han}0-9]+)rst([\\p{sc=Han}0-9]+)uvw
        let vText = dictSP.HanViet[SP];
        let matchCases = Array.from(text.matchAll(new RegExp(strReg, 'ug')));
        if (matchCases.length == 0) return;
        matchCases.forEach(matchCase => {
            if (matchCase.length == 0) return;
            //let cMatch = matchCase.splice(0, 1)[0]; //splice return array; full chinese text match
            let cMatch = matchCase.shift();
            let skipThisStep = false;
            //{V} {N} o dau tien
            if (/^{ N\d?}/.test(SP)) {
                let str = matchCase[0];
                let Length = Math.min(maxLength, str.length);
                for (let k = Length; k > 0; k--) {
                    let subText = str.slice(length - k);
                    if (dictNames.HanViet[subText]) {
                        cMatch = cMatch.replace(str, subText);
                        matchCase[0] = subText;
                        break;
                    }
                    if (k == 1) { skipThisStep = true; break; }
                }
            }

            if (/^{V\d?}/.test(SP)) {
                let str = matchCase[0];
                let Length = Math.min(maxLength, str.length);
                for (let k = Length; k > 0; k--) {
                    let subText = str.slice(length - k);
                    if (dictNames.HanViet[subText] || dictVP.HanViet[subText]) {
                        cMatch = cMatch.replace(str, subText);
                        matchCase[0] = subText;
                        break;
                    }
                    if (k == 1) { skipThisStep = true; break; }
                }
            }

            ////{V} {N} o cuoi cung
            if (/{N\d?}$/.test(SP)) {
                let str = matchCase.at(-1);
                let Length = Math.min(maxLength, str.length);
                for (let k = Length; k > 0; k--) {
                    let subText = str.slice(0, k);
                    if (dictNames.HanViet[subText]) {
                        cMatch = cMatch.replace(str, subText);
                        matchCase[matchCase.length - 1] = subText;
                        break;
                    }
                    if (k == 1) { skipThisStep = true; break; }
                }
            }

            if (/{V\d?}$/.test(SP)) {
                let str = matchCase.at(-1);
                let Length = Math.min(maxLength, str.length);
                for (let k = Length; k > 0; k--) {
                    let subText = str.slice(0, k);
                    if (dictNames.HanViet[subText] || dictVP.HanViet[subText]) {
                        cMatch = cMatch.replace(str, subText);
                        matchCase[matchCase.length - 1] = subText;
                        break; //if found then break
                    }
                    if (k == 1) { skipThisStep = true; break; }
                }
            }
            if (skipThisStep) return;
            let vText1 = vText;
            searchEl.forEach((el, index) => vText1 = vText1.replace(el, matchCase[index]))
            if (Ngoac) text = text.replaceAll(cMatch, `<${vText1}>`);
            else text = text.replaceAll(cMatch, vText1);
        })
    })
    return text;
}


function transPhienAm(text) {
    if (dictPhienAm == undefined) return text;
    dictPhienAm.Han.forEach(Han => text = text.replaceAll(Han, ` ${dictPhienAm.HanViet[Han]}`));
    return text.trim();
}

function transPhienAmSimple(text) {
    if (dictPhienAm == undefined) return text;
    text = text.split('').reduce((txt, Han) => { txt + dictPhienAm.HanViet[Han] ? (' ' + dictPhienAm.HanViet[Han]) : Han }, '');
    return text.trim();
}

function transWOrder(text, Ngoac = true, Motnghia = false, Daucach = ';', XoaDich = false) {
    if (dictNames == undefined) dictNames = { Han: [], HanViet: {} };
    if (dictVP == undefined) dictVP = { Han: [], HanViet: {} };
    if (dictPhienAm == undefined) dictPhienAm = { Han: [], HanViet: {} };
    const DichLieuTru = ['的', '了', '著'];
    let resultArr = [];
    resultArr.orgText = text;

    let tmpPhrase = {};
    dictNames.Han.forEach(Han => {
        while (text.indexOf(Han) > -1) {
            tmpPhrase.orgText = Han;
            tmpPhrase.pos = text.indexOf(Han);
            tmpPhrase.transText = dictNames.HanViet[Han];
            tmpPhrase.dict = 'Names';
            text = text.replace(Han, '\u0528'.repeat(Han.length));
            resultArr.push(tmpPhrase);
            tmpPhrase = {};
        }
    });

    dictVP.Han.forEach(Han => {
        while (text.indexOf(Han) > -1) {
            tmpPhrase.orgText = Han;
            tmpPhrase.pos = text.indexOf(Han);
            tmpPhrase.transText = dictVP.HanViet[Han];
            tmpPhrase.dict = 'VP';
            if (Motnghia) tmpPhrase.transText = dictVP.HanViet[Han].split(Daucach)[0];
            if (Ngoac) tmpPhrase.transText = `[${tmpPhrase.transText}]`;
            text = text.replace(Han, '\u0528'.repeat(Han.length));
            resultArr.push(tmpPhrase);
            tmpPhrase = {};
        }
    })

    if (XoaDich) DichLieuTru.forEach(dich => text = text.replaceAll(dich, '\u0528'));

    let textPA = text.replaceAll(/\u0528/g, '');
    textPA.split('').forEach(Han => {
        while (text.indexOf(Han) > -1) {
            tmpPhrase.orgText = Han;
            tmpPhrase.pos = text.indexOf(Han);
            if (dictPhienAm.HanViet[Han]) { tmpPhrase.transText = dictPhienAm.HanViet[Han]; tmpPhrase.dict = 'PhienAm'; }
            else tmpPhrase.transText = Han;
            text = text.replace(Han, '\u0528');
            resultArr.push(tmpPhrase);
            tmpPhrase = {};
        }

    })
    resultArr.sort((a, b) => a.pos - b.pos);
    while (/^\s/.test(resultArr[0].orgText)) resultArr.shift();  //resultArr.splice(0, 1); //Xoa ' ',\n... o dau

    resultArr.transText = resultArr.reduce((str, el) => {
        if (el.dict) str += ` ${el.transText}`;
        else str += `${el.transText}`
        return str;
    }, '').trim();

    resultArr.reduce((pos, el) => {
        el.vietPos = pos;
        if (!el.dict && pos == 0) pos++;
        if (el.dict) pos = pos + el.transText.length;
        pos++; // 1 do ' '
        return pos;
    }, 0);
    return resultArr;
}

function firstRun() {
    let request = indexedDB.open("QTlikedWebExt", 1);

    request.onupgradeneeded = () => {
        let dbase = request.result;
        if (!dbase.objectStoreNames.contains("dataStore"))
            dbase.createObjectStore("dataStore", { keyPath: 'name' });
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

function loadData() {
    const request = indexedDB.open("QTlikedWebExt", 1);
    let tmpDicts = {};
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            dbase = request.result;
            if (dbase.objectStoreNames.contains("dataStore")) {
                let tt = dbase.transaction('dataStore').objectStore('dataStore').getAll();
                tt.onsuccess = function (e) {
                    if (e.target.result == undefined) reject();
                    else {
                        e.target.result.forEach(data1 => {
                            switch (data1.name) {
                                case 'Options': Options = JSON.parse(data1.data); break;
                                case 'PhienAm': dictPhienAm = JSON.parse(data1.data); break;
                                case 'Names': dictNames = JSON.parse(data1.data); break;
                                case 'VP': dictVP = JSON.parse(data1.data); break;
                                case 'SP': dictSP = JSON.parse(data1.data); break;
                                default: reject();
                            }
                        })
                        resolve();
                    }
                }
                tt.onerror = () => reject();
                dbase.close();
            }
            request.onerror = () => reject();
        };
    });
}

function loadOptions() {
    const request = indexedDB.open("QTlikedWebExt", 1);
    let tmpDicts = {};

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            dbase = request.result;
            if (dbase.objectStoreNames.contains("dataStore")) {
                let tt = dbase.transaction('dataStore').objectStore('dataStore').get('Options');
                tt.onsuccess = function (e) {
                    if (e.target.result == undefined) reject();
                    else { Options = JSON.parse(e.target.result.data); resolve(); }
                }
                tt.onerror = () => reject();
                dbase.close();
            }
        }
        request.onerror = () => reject();
    });
}

function syncWithUnsavedDicts() {
    browser.storage.local.get('dictVP', a => {
        let unSavedVP = a.dictVP || {};
        let Han = Object.keys(unSavedVP);
        Han.forEach(el => {
            if (unSavedVP[el].action == 'update') {
                dictVP.HanViet[el] = unSavedVP[el].transText;
                if (dictVP.Han.indexOf(el) < 0) dictVP.Han.push(el)
            }
            else {
                dictVP.Han.splice(dictVP.Han.indexOf(el), 1);
                delete dictVP.HanViet[el];
            }
        });
    })

    browser.storage.local.get('dictNames', a => {
        let unSavedNames = a.dictNames || {};
        let Han = Object.keys(unSavedNames);
        Han.forEach(el => {
            if (unSavedNames[el].action == 'update') {
                dictNames.HanViet[el] = unSavedNames[el].transText;
                if (dictNames.Han.indexOf(el) < 0) dictNames.Han.push(el)
            }
            else {
                dictVP.Han.splice(dictVP.Han.indexOf(el), 1);
                delete dictVP.HanViet[el];
            }
        });
    })
}

function editPhrase(payload, dict) {
    let textTrung;
    if (!payload) return;
    if (payload.Viet != payload.Trung || !(/[\u3400-\u9FBF]+/.test(payload.Viet))) {
        transArr = transWOrder(payload.Trung);
        if (payload.start > payload.end) [payload.start, payload.end] = [payload.end, payload.start]
        trungArr1 = transArr.filter(el => el.vietPos <= payload.end);
        trungArr = trungArr1.filter(el => el.vietPos >= payload.start);
        if (trungArr.length == 0) trungArr.push(trungArr1.pop());
        if (trungArr[0].vietPos > payload.start) trungArr.unshift(transArr[transArr.indexOf(trungArr[0]) - 1]);

        textTrung = trungArr.reduce((txt, el) => txt += el.orgText, '');
    } else textTrung = payload.Trung;

    let phienam = transPhienAm(textTrung);
    let trans = '';
    if (dict == 'Names') trans = transPhienAm(textTrung)
    else trans = VPTrans(textTrung, false);
    let query = `?dict=${dict}&trung=${encodeURIComponent(textTrung)}&phienam=${encodeURIComponent(phienam)}&trans=${encodeURIComponent(trans)}`;
    browser.windows.create({ focused: true, left: 300, top: 300, width: 500, height: 200, type: 'popup', url: 'editphrase.html' + query })
}

function dictToRaw(dict) {
    return dict.Han.reduce((t, han) => t += `${han}=${dict.HanViet[han]}\n`, '')
}

function saveData() {
    const request = indexedDB.open("QTlikedWebExt", 1);
    let tmpDicts = []; tmpDicts['Names'] = dictNames; tmpDicts['VP'] = dictVP; tmpDicts['Options'] = Options;
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
    }
}

function exportDicts() {
    let zip = new JSZip();
    Options.optionLastSavedTime = new Date();
    if (dictVP) { zip.file('Vietphrase.txt', dictToRaw(dictVP)); browser.storage.local.remove('dictVP'); }
    if (dictNames) { zip.file('Names.txt', dictToRaw(dictNames)); browser.storage.local.remove('dictNames'); }
    if (dictPhienAm) zip.file('PhienAm.txt', dictToRaw(dictPhienAm));
    if (dictSP) zip.file('Strucphrase.txt', dictToRaw(dictSP));

    if (!Options['optionNgayLuu']) fileName = 'VPDicts' + (new Date()).toISOString().slice(0, 10).replace(/-/g, '') + '.zip';
    else fileName = (Options['optionDictName'] || 'VPDicts') + (new Date()).toISOString().slice(0, 10).replace(/-/g, '') + '.zip';

    saveData(); //save Names, VP, Options to indexedDB
    zip.generateAsync({ type: "blob" }).then((content) => {
        browser.downloads.download({
            url: URL.createObjectURL(content),
            filename: fileName,
            saveAs: true
        }, () => console.log('Start download'));
    })
}

function autoSaveDicts() {
    if ((new Date()) - Options.optionLastSavedTime > Options.optionDays * 24 * 3600 * 1000) exportDicts()
}

function updateContextMenus() {
    try { browser.contextMenus.remove('editVP'); browser.contextMenus.remove('editName'); }
    catch { }
    if (!Options.optionSp) {
        const editName = browser.contextMenus.create({
            'id': 'editName',
            "contexts": ["selection"],
            "title": "Edit Name",
        });

        const editVP = browser.contextMenus.create({
            'id': 'editVP',
            "contexts": ["selection"],
            "title": "Edit Vietphrase",
        });
    }
}

browser.runtime.onInstalled.addListener(({ reason }) => { if (reason == 'install') browser.tabs.create({ url: "options.html" }) });
firstRun();
loadData().then(() => {
    console.log('Data loaded');
    updateContextMenus();
    syncWithUnsavedDicts();
    autoSaveDicts();
})
    .catch(() => console.log('Cannot load Data'));


browser.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case 'editName': browser.tabs.query({ active: true, currentWindow: true }).then((tabs) =>
            browser.tabs.sendMessage(tabs[0].id, { "action": "sendName", "payload": info.selectionText },
                { frameId: info.frameId }).then(mess => editPhrase(mess.payload, 'Names'))); break;
        case 'editVP': browser.tabs.sendMessage(tab.id, { "action": "sendVP", "payload": info.selectionText }, { frameId: info.frameId }).then(res => editPhrase(res.payload, 'VP')); break;
    }
});