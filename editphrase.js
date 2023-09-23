let dictNames = {};
let dictVP = {};
chrome.storage.local.get('dictVP', a => dictVP = a.dictVP || {})
chrome.storage.local.get('dictNames', a => dictNames = a.dictNames || {})

function $(e) { return e ? document.getElementById(e) || document.querySelector(e) : false };
function capName(txt) { return txt.split(' ').map(el => el.charAt().toUpperCase() + el.slice(1)).join(' ').trim(); }
async function save() {
    let trung = $('trung').value.trim();
    let trans = $('trans').value.trim();

    // if (!(/{[\p{sc=Han}0-9]+}/ug.test(trung))) { alert('Ô Trung phải là chữ Trung'); return; }

    if (trung)
        if (trung != '' && trans != '' && dict == 'Names') {
            dictNames[trung] = { action: 'update', transText: trans };
            await chrome.storage.local.set({ 'dictNames': dictNames });
        }

    if (trung != '' && trans != '' && dict == 'VP') {
        dictVP[trung] = { action: 'update', transText: trans };
        await chrome.storage.local.set({ 'dictVP': dictVP });
    }

    let data = {
        'dict': dict,
        'action': 'update',
        'transText': trans,
        'orgText': trung
    };
    chrome.runtime.sendMessage({ 'action': 'from Edit page with love', 'payload': data });
    window.close();
}

async function remove() {
    let trung = $('trung').value.trim();
    // let trans = $('trans').value.trim();
    // if (!/[{\p{sc=Han}0-9]+}/ug.test(trung)) { alert('Ô Trung phải là chữ Trung'); return; }
    if (trung != '' && dict == 'Names') {
        dictNames[trung] = { action: 'delete', transText: '' };
        await chrome.storage.local.set({ 'dictNames': dictNames });
    }

    if (trung != '' && dict == 'VP') {
        dictVP[trung] = { action: 'delete', transText: '' };
        await chrome.storage.local.set({ 'dictVP': dictVP });
    }

    let data = {
        'dict': dict,
        'action': 'delete',
        'transText': '',
        'orgText': trung
    };
    chrome.runtime.sendMessage({ 'action': 'from Edit page with hate', 'payload': data });
    window.close();
}

function cancel() {
    window.close()
}

//window.onblur = window.close();
let params = new URLSearchParams(document.location.search);
let dict = params.get("dict");
$('trung').value = params.get("trung");
$('phienam').value = params.get("phienam");
if (dict == 'Names') {
    document.title = 'Edit Name';
    $('trans').value = capName(params.get("trans"));
}
else {
    document.title = 'Edit Vietphrase';
    $("label[for='trans']").innerText = 'Vietphrase';
    $('trans').value = params.get("trans");
}

$('save').onclick = save;
$('delete').onclick = remove;
$('cancel').onclick = cancel;