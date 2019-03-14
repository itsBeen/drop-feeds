/*global browser ThemeManager JSZip ZipTools LocalStorageManager Transfer TextTools*/
'use strict';
class ThemeCustomManager { /*exported ThemeCustomManager*/
  static get instance() { return (this._instance = this._instance || new this()); }

  get kind() { return ThemeManager.instance.kind; }

  async exportThemeCustom_async(themeKind, themeName) {
    let themeNameNoPrefix = this.getThemeNameWithoutPrefix(themeKind, themeName);
    let isCustomTheme = this.isCustomTheme(themeName);
    let zipCustomTheme = null;
    let suffix = '';
    if (isCustomTheme) {
      zipCustomTheme = await this.getThemeArchive_async(themeKind, themeName);
    }
    else {
      suffix = ' (copy of)';
      zipCustomTheme = await this.getCustomFromBuiltin_async(themeKind, themeName);
    }
    let newName = themeNameNoPrefix + suffix;
    let zipBlob = await zipCustomTheme.generateAsync({ type: 'blob' });
    let url = URL.createObjectURL(zipBlob);
    browser.downloads.download({ url: url, filename: 'df - ' + themeKind + ' - ' + newName + '.zip', saveAs: true });
  }

  async getCustomCssUrl_async(themeName, sheetFile, themeKind, sheetFolder) {
    let sheetUrl = await this._loadCustomSheet_async(themeName, sheetFile, themeKind, sheetFolder, sheetFolder);
    return sheetUrl;
  }

  async getCustomFromBuiltin_async(themeKind, themeName) {
    let zip = new JSZip();
    let baseFolder = ThemeManager.instance.getBaseFolderForThemeKind(themeKind, themeName);
    let fileListUrl = browser.runtime.getURL(baseFolder + '/files.list');
    let fileList = (await Transfer.downloadTextFile_async(fileListUrl)).trim().split('\n');
    for (let file of fileList) {
      if (file == './files.list') { continue; }
      file = file.replace('./', '');
      let fileUrl = browser.runtime.getURL(baseFolder + '/' + file);
      zip.file(file, ZipTools.getBinaryContent_async(fileUrl), { binary: true });
    }
    let archiveInfo = { fileType: 'df-custom-theme', themeInfo: { themeKind: themeKind } };
    let archiveInfoJson = JSON.stringify(archiveInfo);
    zip.file('archiveInfo.json', archiveInfoJson);
    return zip;
  }

  async getCustomThemeList_async(themeKind) {
    let storageKey = this._themeStorageKeyFromKind(themeKind);
    let themeList = await LocalStorageManager.getValue_async(storageKey, []);
    themeList = themeList.map((themeName) => this.getThemeNameWithPrefix(themeKind, themeName) + ';' + themeName);
    return themeList;
  }

  async getThemeArchive_async(kind, themeName) {
    let themeNameWithPrefix = this.getThemeNameWithPrefix(kind, themeName);
    let zipFile = await LocalStorageManager.getValue_async(themeNameWithPrefix, null);
    if (!zipFile) { return null; }
    let zipArchive = await JSZip.loadAsync(zipFile);
    return zipArchive;
  }

  getThemeNameWithoutPrefix(kind, themeName) {
    let prefix = kind + ':';
    themeName = (themeName.startsWith(prefix) ? themeName.replace(prefix, '') : themeName);
    return themeName;
  }

  getThemeNameWithPrefix(kind, themeName) {
    let prefix = kind + ':';
    themeName = (themeName.startsWith(prefix) ? themeName : prefix + themeName);
    return themeName;
  }

  async getThemeResourceUrl_async(themeKind, targetResource) {
    let themeName = ThemeManager.instance.getThemeFolderForThemeKind(themeKind);
    let resourceUrl = await this._loadCustomResource_async(themeKind, themeName, targetResource);
    return resourceUrl;
  }

  async importThemeCustom_async(zipFile, themeName) {
    try {
      let zipArchive = await JSZip.loadAsync(zipFile);
      if (!zipArchive) { return { error: 'notValidThemeArchive', value: null }; }
      let archiveInfoJsonFile = zipArchive.file('archiveInfo.json');
      if (!archiveInfoJsonFile) { return { error: 'notValidThemeArchive', value: null }; }
      let archiveInfoJson = await archiveInfoJsonFile.async('text');
      if (!archiveInfoJson) { return { error: 'notValidThemeArchive', value: null }; }
      let archiveInfo = JSON.parse(archiveInfoJson);
      if (!archiveInfo || !archiveInfo.fileType || archiveInfo.fileType != 'df-custom-theme' || !archiveInfo.themeInfo || archiveInfo.themeInfo.themeKind) {
        return { error: 'notValidThemeArchive', value: null };
      }
      if (!this._isValidThemeKind(archiveInfo.themeKind)) { return { error: 'notValidThemeArchive', value: 'invalid theme kind' }; }
      let listStorageKey = this._themeStorageKeyFromKind(archiveInfo.themeInfo.themeKind);
      let themesList = await LocalStorageManager.getValue_async(listStorageKey, []);
      let isNewNameAvailable = !themesList.includes(themeName);
      if (!isNewNameAvailable) { return { error: 'alreadyExist', value: themeName }; }
      themesList.push(themeName);
      themesList = [...new Set(themesList)];
      await LocalStorageManager.setValue_async(listStorageKey, themesList);
      let themeNameWithPrefix = this.getThemeNameWithPrefix(archiveInfo.themeInfo.themeKind, themeName);
      await LocalStorageManager.setValue_async(themeNameWithPrefix, zipFile);
    }
    catch (e) {
      return { error: 'notValidThemeArchive', value: e };
    }
    return null;
  }

  async isNewNameAvailable_async(themeKind, newName) {
    let listStorageKey = this._themeStorageKeyFromKind(themeKind);
    let themesList = await LocalStorageManager.getValue_async(listStorageKey, []);
    let isNewNameAvailable = !themesList.includes(newName);
    return isNewNameAvailable;

  }

  async renameCustomTheme_async(themeKind, oldName, newName) {
    try {
      oldName = this.getThemeNameWithoutPrefix(themeKind, oldName);
      newName = this.getThemeNameWithoutPrefix(themeKind, newName);
      let oldNameWithPrefix = this.getThemeNameWithPrefix(themeKind, oldName);
      let newNameWithPrefix = this.getThemeNameWithPrefix(themeKind, newName);
      let listStorageKey = this._themeStorageKeyFromKind(themeKind);
      let themesList = await LocalStorageManager.getValue_async(listStorageKey, []);
      let isNewNameAvailable = !themesList.includes(newName);
      if (!isNewNameAvailable) { return { error: 'alreadyExist', value: newName }; }
      let zipArchive = await this.getThemeArchive_async(themeKind, oldNameWithPrefix);
      let zipBlob = await zipArchive.generateAsync({ type: 'blob' });
      await LocalStorageManager.setValue_async(newNameWithPrefix, zipBlob);
      await browser.storage.local.remove(oldNameWithPrefix);
      themesList = themesList.map((themeName) => (themeName == oldName ? newName : themeName));
      themesList = [...new Set(themesList)];
      await LocalStorageManager.setValue_async(listStorageKey, themesList);
    }
    catch (e) {
      return { error: 'error', value: e };
    }

  }

  _isValidThemeKind(themeKind) {
    return Object.values(this.kind).includes(themeKind);
  }

  isCustomTheme(themeName) {
    let isCustomTheme = themeName.startsWith(this.kind.mainTheme + ':')
      || themeName.startsWith(this.kind.renderTemplate + ':')
      || themeName.startsWith(this.kind.renderTheme + ':')
      || themeName.startsWith(this.kind.scriptEditorTheme + ':');
    return isCustomTheme;
  }

  async isThemeKindOf_async(kind, themeName) {
    themeName = this.getThemeNameWithoutPrefix(kind, themeName);
    let listStorageKey = this._themeStorageKeyFromKind(kind);
    let themesList = await LocalStorageManager.getValue_async(listStorageKey, []);
    return themesList.includes(themeName);
  }

  async removeTheme_async(kind, themeName) {
    let themeNameNoPrefix = this.getThemeNameWithoutPrefix(kind, themeName);
    let themeNamePrefix = this.getThemeNameWithPrefix(kind, themeName);
    let storageKey = this._themeStorageKeyFromKind(kind);
    let themeCustomList = await LocalStorageManager.getValue_async(storageKey, []);
    themeCustomList = themeCustomList.filter((thName) => thName !== themeNameNoPrefix);
    await LocalStorageManager.setValue_async(storageKey, themeCustomList);
    await browser.storage.local.remove(themeNamePrefix);
  }

  async _addCssToZip_async(zipFolder, fileName, sheetUrl, themeName) {
    let cssMainText = await Transfer.downloadTextFile_async(sheetUrl);
    cssMainText = TextTools.replaceAll(cssMainText, 'url(/themes/' + themeName + '/', 'url([archive]/');
    zipFolder.file(fileName, cssMainText);
  }

  async _loadCustomResource_async(kind, themeName, targetResource) {
    let themeArchive = await this.getThemeArchive_async(kind, themeName);
    let resourceBlob = await themeArchive.file(targetResource).async('blob');
    let resourceUrl = URL.createObjectURL(resourceBlob);
    await Transfer.downloadTextFile_async(resourceUrl);
    return resourceUrl;
  }

  async _loadCustomSheet_async(themeName, sheetFile, kind, sheetFolder) {
    let themeArchive = await this.getThemeArchive_async(kind, themeName);
    if (!themeArchive) { return null; }
    let cssText = await themeArchive.file(sheetFolder + '/' + sheetFile).async('text');

    let urlList = [...new Set(await this._urlListFromTextCss(cssText))];
    urlList = urlList.filter((url) => url.includes('[archive]'));
    for (let url of urlList) {
      let filePath = url.split(']')[1].substring(1);
      let fileBlob = await themeArchive.file(filePath).async('blob');
      let urlField = 'url(' + url + ')';
      let fileUrlField = 'url(' + URL.createObjectURL(fileBlob) + ')';
      cssText = TextTools.replaceAll(cssText, urlField, fileUrlField);
    }
    let sheetBlob = new Blob([cssText]);
    let sheetUrl = URL.createObjectURL(sheetBlob);
    return sheetUrl;
  }

  _themeStorageKeyFromKind(themeKind) {
    return themeKind + 'List';
  }

  async _urlListFromCss_async(cssUrl) {
    cssUrl = browser.runtime.getURL(cssUrl);
    let ccsText = await Transfer.downloadTextFile_async(cssUrl);
    let urlList = this._urlListFromTextCss(ccsText);
    return urlList;
  }

  _urlListFromTextCss(ccsText) {
    /*eslint-disable no-useless-escape*/
    let regexUrls = /url\((?!['"]?:)['"]?([^'"\)]*)['"]?\)/g;
    /*eslint-enable no-useless-escape*/
    let urlList = ccsText.match(regexUrls);
    if (!urlList) { urlList = []; }
    urlList = urlList.map((url) => {
      return (url ? url.slice(4, -1) : '');
    });
    return urlList;
  }
}