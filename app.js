
        // Core Internal File-System Data Tree Model Scheme
        let appDatastore = {
            "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <link rel='stylesheet' href='style.css'>\n</head>\n<body>\n  <h2>TallyBook Studio Compilation Engine</h2>\n  <p id='status-msg'>Wiring multiple cross-linked asset instances...</p>\n  <script src='js/main.js'><\/script>\n</body>\n</html>",
            "style.css": "body { background-color: #050505; color: #00ffcc; text-align: center; font-family: monospace; padding-top: 60px; }\nh2 { color: #ff0055; }",
            "js/main.js": "setTimeout(() => {\n  document.getElementById('status-msg').innerText = 'Success: multi-files & subfolders linked dynamically!';\n}, 1200);"
        };

        let activeFile = "index.html";
let openTabsList = ["index.html", "style.css", "js/main.js"];
let modalOperationModeContext = "";
let deletionTargetAssetContext = "";
let currentDirectory = "";
let navigationHistory = [];

        const editor = document.getElementById('editor');
        const highlightLayer = document.getElementById('highlight-layer');
        const lineGutter = document.getElementById('lineGutter');

        window.onload = () => {
            if(localStorage.getItem('tally_studio_v2_storage')) {
                appDatastore = JSON.parse(localStorage.getItem('tally_studio_v2_storage'));
            }
            synchronizeApplicationViewInstance();
            window.history.pushState({view: 'editor_base'}, '');
        };

        window.onpopstate = () => { handleAndroidBack(); };

        function handleAndroidBack() {
            if (document.getElementById('sandboxView').style.display === 'flex') {
                closePreview();
            } else if (document.getElementById('customModalOverlay').classList.contains('active')) {
                closeCustomModal();
            } else if (currentDirectory) {
                goBackDirectory();
            } else if (!document.getElementById('sidebar').classList.contains('hidden')) {
                document.getElementById('sidebar').classList.add('hidden');
            }
            window.history.pushState({view: 'editor_base'}, '');
        }

        function synchronizeApplicationViewInstance() {
            const currentData = appDatastore[activeFile];
            editor.value = typeof currentData === 'object'
                ? currentData.content
                : (currentData || '');

            renderHorizontalTabSystem();
            renderFolderTreeExplorer();
            runSyntaxColorizationEngine();
            recalculateLineNumberGutters();
        }

        function runSyntaxColorizationEngine() {
            let parsedText = editor.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            parsedText = parsedText.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>');
            parsedText = parsedText.replace(/(&lt;\/?[a-zA-Z1-6]+)/g, '<span class="hl-tag">$1</span>');
            parsedText = parsedText.replace(/(\s[a-zA-Z0-9-]+)(=)/g, '<span class="hl-attr">$1</span>$2');
            parsedText = parsedText.replace(/("[\s\S]*?")/g, '<span class="hl-str">$1</span>');
            parsedText = parsedText.replace(/'([\s\S]*?)'/g, '<span class="hl-str">$1</span>');
            parsedText = parsedText.replace(/\b(function|const|let|var|if|else|return|document|window|setTimeout)\b/g, '<span class="hl-js">$1</span>');
            parsedText = parsedText.replace(/\b(\d+)\b/g, '<span class="hl-num">$1</span>');
            highlightLayer.innerHTML = parsedText + "\n";
        }

        function recalculateLineNumberGutters() {
            const count = editor.value.split('\n').length;
            let constructHtml = ''; for(let line = 1; line <= count; line++) { constructHtml += line + '<br>'; }
            lineGutter.innerHTML = constructHtml;
        }

        editor.addEventListener('input', () => {
            if(typeof appDatastore[activeFile] === 'object') {
                appDatastore[activeFile].content = editor.value;
            } else {
                appDatastore[activeFile] = editor.value;
            }

            runSyntaxColorizationEngine();
            recalculateLineNumberGutters();
            localStorage.setItem('tally_studio_v2_storage', JSON.stringify(appDatastore));
        });

        editor.addEventListener('scroll', () => {
            highlightLayer.scrollTop = editor.scrollTop;
            highlightLayer.scrollLeft = editor.scrollLeft;
            lineGutter.scrollTop = editor.scrollTop;
        });

        function renderHorizontalTabSystem() {
            const container = document.getElementById('tabsBarContainer'); container.innerHTML = '';
            openTabsList.forEach(fileName => {
                const tab = document.createElement('div');
                tab.className = `tab ${fileName === activeFile ? 'active' : ''}`;
                tab.onclick = () => { activeFile = fileName; synchronizeApplicationViewInstance(); };
                tab.innerHTML = `<span>${fileName.split('/').pop()}</span><span class="close-tab" onclick="closeTargetTabInstance('${fileName}', event)">×</span>`;
                container.appendChild(tab);
            });
        }

        function closeTargetTabInstance(file, event) {
            event.stopPropagation();
            openTabsList = openTabsList.filter(item => item !== file);
            if(activeFile === file && openTabsList.length > 0) activeFile = openTabsList[0];
            synchronizeApplicationViewInstance();
        }

        // Folder Explorer Tree Rendering Engine System
        function renderFolderTreeExplorer() {
    const displayBox = document.getElementById('fileTreeContainer');
    displayBox.innerHTML = '';

    if(currentDirectory) {
        const backBtn = document.createElement('div');
        backBtn.className = 'tree-item';
        backBtn.innerHTML = '<span>⬅ Back</span>';
        backBtn.onclick = goBackDirectory;
        displayBox.appendChild(backBtn);
    }

    const shownFolders = new Set();

    Object.keys(appDatastore).forEach(path => {
        let relativePath = currentDirectory
            ? (path.startsWith(currentDirectory + '/') ? path.slice(currentDirectory.length + 1) : null)
            : path;

        if(relativePath === null || !relativePath) return;
        if(relativePath === '.folder') return;

        const parts = relativePath.split('/');

        if(parts.length > 1) {
            const folderName = parts[0];

            if(shownFolders.has(folderName)) return;
            shownFolders.add(folderName);

            const folderPath = currentDirectory
                ? currentDirectory + '/' + folderName
                : folderName;

            const folderItem = document.createElement('div');
            folderItem.className = 'tree-item';
            folderItem.onclick = () => enterDirectory(folderPath);
            folderItem.innerHTML = `<span>📁 ${folderName}</span><span class="delete-node-btn" onclick="triggerCustomDeleteModal('${folderPath}', event)">×</span>`;
            displayBox.appendChild(folderItem);

            return;
        }

        if(parts[0].endsWith('.folder')) return;

        const leafItem = document.createElement('div');
        leafItem.className = `tree-item ${path === activeFile ? 'active-file' : ''}`;
        leafItem.onclick = () => launchFileIntoWorkspace(path);
        leafItem.innerHTML = `<span>📄 ${parts[0]}</span><span class="delete-node-btn" onclick="triggerCustomDeleteModal('${path}', event)">×</span>`;
        displayBox.appendChild(leafItem);
    });
}

        function launchFileIntoWorkspace(path) {
    if(!openTabsList.includes(path)) openTabsList.push(path);
    activeFile = path;
    synchronizeApplicationViewInstance();
}

function enterDirectory(path) {
    navigationHistory.push(currentDirectory);
    currentDirectory = path;
    renderFolderTreeExplorer();
}

function goBackDirectory() {
    currentDirectory = navigationHistory.pop() || "";
    renderFolderTreeExplorer();
}

        // HIGH GRAPHICS CUSTOM MODAL DIALOG FLOW SYSTEM
        function openCustomModal(mode) {
            modalOperationModeContext = mode;
            const screenOverlay = document.getElementById('customModalOverlay');
            const inputField = document.getElementById('modalMainInputField');
            const inputContainer = document.getElementById('modalStandardInputFieldContainer');
            const settingsContainer = document.getElementById('modalSettingsFormContainer');
            const headTitle = document.getElementById('modalDisplayTitle');

            inputContainer.classList.remove('hidden-element');
            settingsContainer.classList.add('hidden-element');
            inputField.value = '';

            if(mode === 'file') headTitle.innerText = 'Create Workspace File Asset';
            if(mode === 'folder') headTitle.innerText = 'Create Empty Project Folder';
            if(mode === 'saveas') { headTitle.innerText = 'Save Copy As New File Name'; inputField.value = 'copy_' + activeFile; }

            screenOverlay.classList.add('active');
            document.getElementById('modalSubmitActionButton').onclick = commitModalLogicalState;
        }

        function triggerCustomDeleteModal(target, event) {
            if (event) event.stopPropagation();
            modalOperationModeContext = 'delete';
            deletionTargetAssetContext = target;
            
            const screenOverlay = document.getElementById('customModalOverlay');
            document.getElementById('modalStandardInputFieldContainer').classList.add('hidden-element');
            document.getElementById('modalSettingsFormContainer').classList.add('hidden-element');
            document.getElementById('modalDisplayTitle').innerText = `Confirm deleting asset: "${target}"?`;
            
            screenOverlay.classList.add('active');
            document.getElementById('modalSubmitActionButton').onclick = commitModalLogicalState;
        }

        function openSettingsDialog() {
            modalOperationModeContext = 'settings';
            const screenOverlay = document.getElementById('customModalOverlay');
            document.getElementById('modalStandardInputFieldContainer').classList.add('hidden-element');
            document.getElementById('modalSettingsFormContainer').classList.remove('hidden-element');
            document.getElementById('modalDisplayTitle').innerText = 'Editor Preferences Config';
            
            screenOverlay.classList.add('active');
            document.getElementById('modalSubmitActionButton').onclick = () => { closeCustomModal(); showToastNotification('Settings applied!'); };
        }

        function closeCustomModal() { document.getElementById('customModalOverlay').classList.remove('active'); }

        function commitModalLogicalState() {
            const rawVal = document.getElementById('modalMainInputField').value.trim();
            
            if(modalOperationModeContext === 'file') {
    if(!rawVal) return;

    const fullPath = currentDirectory
        ? currentDirectory + '/' + rawVal
        : rawVal;

    appDatastore[fullPath] = ``;
    launchFileIntoWorkspace(fullPath);
    showToastNotification('File asset successfully initialized!');
}
            else if(modalOperationModeContext === 'folder') {
    if(!rawVal) return;

    const fullPath = currentDirectory
        ? currentDirectory + '/' + rawVal
        : rawVal;

    if(!Object.keys(appDatastore).some(key => key.startsWith(fullPath + "/"))) {
        appDatastore[fullPath + "/.folder"] = "";
    }

    showToastNotification('Folder space map generated!');
}
            else if(modalOperationModeContext === 'saveas') {
                if(!rawVal) return;
                appDatastore[rawVal] = editor.value;
                launchFileIntoWorkspace(rawVal);
                showToastNotification('Asset snapshot duplicated!');
            } 
            else if(modalOperationModeContext === 'delete') {
                // Delete explicit file or recursive directory match tree keys
                Object.keys(appDatastore).forEach(key => {
                    if(key === deletionTargetAssetContext || key.startsWith(deletionTargetAssetContext + '/')) {
                        delete appDatastore[key];
                        openTabsList = openTabsList.filter(t => t !== key);
                    }
                });
                if(!appDatastore[activeFile]) activeFile = Object.keys(appDatastore)[0] || '';
                showToastNotification('Selected items purged successfully!');
            }

            localStorage.setItem('tally_studio_v2_storage', JSON.stringify(appDatastore));
            closeCustomModal();
            synchronizeApplicationViewInstance();
        }

        function showToastNotification(message) {
            const b = document.getElementById('toastMessageBanner'); b.innerText = message;
            b.style.display = 'block'; setTimeout(() => { b.style.display = 'none'; }, 2000);
        }

        function triggerManualSave() {
            if(typeof appDatastore[activeFile] === 'object') {
                appDatastore[activeFile].content = editor.value;
            } else {
                appDatastore[activeFile] = editor.value;
            }

            localStorage.setItem('tally_studio_v2_storage', JSON.stringify(appDatastore));
            showToastNotification('All current changes saved to disk context!');
        }

        // NATIVE MULTI-FILE ATTACHMENT CONTEXT INTERFACE
        function triggerMultiImport() {
    document.getElementById('multiFileLoader').value = '';
    document.getElementById('multiFileLoader').click();
}
        function processMultiImportEngine(event) {
    const selectedFiles = event.target.files;
    if (selectedFiles.length === 0) return;

    let loadedCounter = 0;

    Array.from(selectedFiles).forEach(file => {
        const reader = new FileReader();

        reader.onload = function(evt) {
            const path = currentDirectory
                ? currentDirectory + '/' + file.name
                : file.name;

            appDatastore[path] = {
                content: evt.target.result,
                type: file.type || getMimeType(path),
                binary: isBinaryFile(path)
            };

            if(!openTabsList.includes(path)) {
                openTabsList.push(path);
            }

            loadedCounter++;

            if(loadedCounter === selectedFiles.length) {
                activeFile = currentDirectory
                    ? currentDirectory + '/' + selectedFiles[0].name
                    : selectedFiles[0].name;

                synchronizeApplicationViewInstance();
                showToastNotification(`Batch imported ${selectedFiles.length} file bundles!`);
            }
        };

        if(isBinaryFile(file.name)) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    });
}

        // DEEP ADVANCED COMPILATION MATRIX LINK ROUTER ENGINE
        function compileAndRunWorkspace() {
    const sandbox = document.getElementById('sandboxView');
    const frame = document.getElementById('preview-frame');
    sandbox.style.display = 'flex';

    let entryFile = "index.html";

    if(!appDatastore[entryFile]) {
        entryFile = Object.keys(appDatastore).find(path => path.endsWith('/index.html'));
    }

    if(!entryFile) {
        frame.srcdoc = "<h2>No entry HTML found!</h2>";
        return;
    }

    let htmlObj = appDatastore[entryFile];
    let compilationBuildPayload = typeof htmlObj === 'object' ? htmlObj.content : htmlObj;

    const blobMap = {};

    Object.keys(appDatastore).forEach(path => {
        const fileObj = appDatastore[path];

        if(typeof fileObj === 'object') {
            if(fileObj.binary && fileObj.content.startsWith('data:')) {
                blobMap[path] = fileObj.content;
            } else {
                const blob = new Blob([fileObj.content], { type: fileObj.type });
                blobMap[path] = URL.createObjectURL(blob);
            }
        } else {
            const blob = new Blob([fileObj], { type: getMimeType(path) });
            blobMap[path] = URL.createObjectURL(blob);
        }
    });

    Object.keys(blobMap).forEach(path => {
        const fileName = path.split('/').pop();

        compilationBuildPayload = compilationBuildPayload.replaceAll(`"${path}"`, `"${blobMap[path]}"`);
        compilationBuildPayload = compilationBuildPayload.replaceAll(`'${path}'`, `'${blobMap[path]}'`);
        compilationBuildPayload = compilationBuildPayload.replaceAll(`"${fileName}"`, `"${blobMap[path]}"`);
        compilationBuildPayload = compilationBuildPayload.replaceAll(`'${fileName}'`, `'${blobMap[path]}'`);
    });

    frame.srcdoc = compilationBuildPayload;
}

        // QUICK EDITOR UTILITIES COMMAND ROUTERS
        function executeQuickEditorCommand(type) {
            if(type === 'copy') { navigator.clipboard.writeText(editor.value); showToastNotification('Workspace copied!'); }
            if(type === 'paste') { navigator.clipboard.readText().then(txt => { injectSymbol(txt); }); }
            if(type === 'cut') { navigator.clipboard.writeText(editor.value); editor.value = ''; synchronizeApplicationViewInstance(); }
            if(type === 'clear') { editor.value = ''; synchronizeApplicationViewInstance(); }
            if(type === 'all') { editor.select(); }
        }

        function toggleFindReplacePanel() {
            const p = document.getElementById('findReplacePanel');
            p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
        }

        function executeFindReplaceAction(mode) {
            const findKeyword = document.getElementById('findInputField').value;
            const replaceText = document.getElementById('replaceInputField').value;
            if(!findKeyword) return;

            if(mode === 'find') {
                let position = editor.value.indexOf(findKeyword);
                if(position > -1) { editor.setSelectionRange(position, position + findKeyword.length); editor.focus(); }
                else { showToastNotification('String keyword matched instance not found!'); }
            } else if(mode === 'replace') {
                editor.value = editor.value.replace(findKeyword, replaceText);
                synchronizeApplicationViewInstance();
            } else if(mode === 'all') {
                editor.value = editor.value.split(findKeyword).join(replaceText);
                synchronizeApplicationViewInstance();
            }
        }

        // PREFERENCES SETTINGS CONTROLLERS
        function applyFontScalingRealtime(value) {
            document.documentElement.style.setProperty('--editor-font-size', value + 'px');
            document.getElementById('fontIndicatorVal').innerText = value + 'px';
            recalculateLineNumberGutters();
        }

        function applyVisualThemeMapping(theme) {
            const styleInject = document.getElementById('dynamicColorThemeInjectorSheet');
            if(theme === 'black') {
                styleInject.innerHTML = `:root { --bg-color: #000000; --sidebar-bg: #121212; --text-color: #d4d4d4; --active-tab: #000000; }`;
            } else if(theme === 'vs-dark') {
                styleInject.innerHTML = `:root { --bg-color: #1e1e1e; --sidebar-bg: #252526; --text-color: #d4d4d4; --active-tab: #1e1e1e; }`;
            } else if(theme === 'light') {
                styleInject.innerHTML = `:root { --bg-color: #ffffff; --sidebar-bg: #f3f3f3; --text-color: #1e1e1e; --active-tab: #ffffff; --border-color: #e4e4e4; }`;
            }
        }

        function toggleDropdown() { const m = document.getElementById('optionsMenu'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
        window.addEventListener('click', e => { if(!e.target.closest('.dropdown')) document.getElementById('optionsMenu').style.display = 'none'; });
        function toggleSidebar() { document.getElementById('sidebar').classList.toggle('hidden'); }
        function closePreview() { document.getElementById('sandboxView').style.display = 'none'; }
 function isBinaryFile(name) {
    return /\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|otf|ico)$/i.test(name);
}

function getMimeType(name) {
    if(name.endsWith('.svg')) return 'image/svg+xml';
    if(name.endsWith('.png')) return 'image/png';
    if(name.endsWith('.jpg')) return 'image/jpeg';
    if(name.endsWith('.jpeg')) return 'image/jpeg';
    if(name.endsWith('.gif')) return 'image/gif';
    if(name.endsWith('.webp')) return 'image/webp';
    if(name.endsWith('.woff')) return 'font/woff';
    if(name.endsWith('.woff2')) return 'font/woff2';
    if(name.endsWith('.ttf')) return 'font/ttf';
    if(name.endsWith('.otf')) return 'font/otf';
    if(name.endsWith('.json')) return 'application/json';
    return 'text/plain';
}
       function injectSymbol(c) {
            const s = editor.selectionStart; const e = editor.selectionEnd;
            editor.value = editor.value.substring(0, s) + c + editor.value.substring(e);
            editor.selectionStart = editor.selectionEnd = s + c.length; editor.focus(); runSyntaxColorizationEngine();
        }
    