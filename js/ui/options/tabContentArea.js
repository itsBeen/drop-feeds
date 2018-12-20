/*global browser DefaultValues LocalStorageManager CssManager*/
'use strict';
class TabContentArea { /*exported TabContentArea*/
  static get instance() { return (this._instance = this._instance || new this()); }

  async init_async() {
    this._updateLocalizedStrings();

    let elRenderFeedsCheckbox = document.getElementById('renderFeedsCheckbox');
    elRenderFeedsCheckbox.checked = await LocalStorageManager.getValue_async('renderFeeds', DefaultValues.renderFeeds);
    elRenderFeedsCheckbox.addEventListener('click', (e) => { this._renderFeedsCheckBoxClicked_event(e); });

    let elItemNewTabCheckbox = document.getElementById('itemNewTabCheckbox');
    elItemNewTabCheckbox.checked = await LocalStorageManager.getValue_async('itemNewTab', DefaultValues.itemNewTab);
    elItemNewTabCheckbox.addEventListener('click', (e) => { this._itemNewTabCheckBoxClicked_event(e); });

    let elAlwaysOpenNewTabCheckbox = document.getElementById('alwaysOpenNewTabCheckbox');
    elAlwaysOpenNewTabCheckbox.checked = await LocalStorageManager.getValue_async('alwaysOpenNewTab', DefaultValues.alwaysOpenNewTab);
    elAlwaysOpenNewTabCheckbox.addEventListener('click', (e) => { this._alwaysOpenNewTabCheckBoxClicked_event(e); });

    let elOpenNewTabForegroundCheckbox = document.getElementById('openNewTabForegroundCheckbox');
    elOpenNewTabForegroundCheckbox.checked = await LocalStorageManager.getValue_async('openNewTabForeground', DefaultValues.openNewTabForeground);
    elOpenNewTabForegroundCheckbox.addEventListener('click', (e) => { this._openNewTabForegroundCheckboxClicked_event(e); });

    let elReuseDropFeedsTabCheckbox = document.getElementById('reuseDropFeedsTabCheckbox');
    elReuseDropFeedsTabCheckbox.checked = await LocalStorageManager.getValue_async('reuseDropFeedsTab', DefaultValues.reuseDropFeedsTab);
    elReuseDropFeedsTabCheckbox.addEventListener('click', (e) => { this._reuseDropFeedsTabCheckboxClicked_event(e); });

    let contentsDateTimeFormat = document.getElementById('contentsDateTimeFormat');
    let contentsDateTimeOptions = await LocalStorageManager.getValue_async('dateTimeOptions', DefaultValues.dateTimeOptions);
    contentsDateTimeFormat.value = JSON.stringify(contentsDateTimeOptions);
    contentsDateTimeFormat.addEventListener('keydown', (e) => { this._contentsDateTimeFormatOnchange_event(e); });
    contentsDateTimeFormat.addEventListener('keypress', (e) => { this._contentsDateTimeFormatOnchange_event(e); });
    contentsDateTimeFormat.addEventListener('cut', (e) => { this._contentsDateTimeFormatOnchange_event(e); });
    contentsDateTimeFormat.addEventListener('paste', (e) => { this._contentsDateTimeFormatOnchange_event(e); });
    contentsDateTimeFormat.addEventListener('change', (e) => { this._contentsDateTimeFormatOnchange_event(e); });
    contentsDateTimeFormat.addEventListener('input', (e) => { this._contentsDateTimeFormatOnchange_event(e); });
    contentsDateTimeFormat.addEventListener('blur', (e) => { this._contentsDateTimeFormatOnchange_event(e); });
    let contentsDateTimeResetButton = document.getElementById('contentsDateTimeResetButton');
    contentsDateTimeResetButton.addEventListener('click', (e) => { this._contentsDateTimeResetButtonClicked_event(e); });

    this._contentsDateTimeFormatOnchange_event();
    this._enableItemOptions();
  }

  _updateLocalizedStrings() {
    document.getElementById('textRenderFeeds').textContent = browser.i18n.getMessage('optRenderFeeds');
    document.getElementById('textItemNewTab').textContent = browser.i18n.getMessage('optItemNewTab');
    document.getElementById('textAlwaysOpenNewTab').textContent = browser.i18n.getMessage('optAlwaysOpenNewTab');
    document.getElementById('textOpenNewTabForeground').textContent = browser.i18n.getMessage('optOpenNewTabForeground');
    document.getElementById('textReuseDropFeedsTab').textContent = browser.i18n.getMessage('optReuseDropFeedsTab');
  }

  async _renderFeedsCheckBoxClicked_event() {
    await LocalStorageManager.setValue_async('renderFeeds', document.getElementById('renderFeedsCheckbox').checked);
    this._enableItemOptions();
  }

  async _itemNewTabCheckBoxClicked_event() {
    await LocalStorageManager.setValue_async('itemNewTab', document.getElementById('itemNewTabCheckbox').checked);
  }

  async _alwaysOpenNewTabCheckBoxClicked_event() {
    await LocalStorageManager.setValue_async('alwaysOpenNewTab', document.getElementById('alwaysOpenNewTabCheckbox').checked);
    this._enableItemOptions();
  }

  async _openNewTabForegroundCheckboxClicked_event() {
    await LocalStorageManager.setValue_async('openNewTabForeground', document.getElementById('openNewTabForegroundCheckbox').checked);
  }

  async _reuseDropFeedsTabCheckboxClicked_event() {
    await LocalStorageManager.setValue_async('reuseDropFeedsTab', document.getElementById('reuseDropFeedsTabCheckbox').checked);
  }

  async _contentsDateTimeFormatOnchange_event() {
    let contentsDateTimeOptions = null;
    let dateTimeString = null;
    try {
      contentsDateTimeOptions = JSON.parse(document.getElementById('contentsDateTimeFormat').value);
      dateTimeString = (new Date(2055, 12, 31, 13, 37, 0)).toLocaleString(window.navigator.language, contentsDateTimeOptions);
    }
    catch (e) {
      document.getElementById('contentsDateTimeFormat').classList.add('borderError');
      document.getElementById('contentsDateTimeExample').classList.add('textColorError');
      document.getElementById('contentsDateTimeExample').textContent = e.message.replace('JSON.parse: ', '');
      return;
    }
    document.getElementById('contentsDateTimeFormat').classList.remove('borderError');
    document.getElementById('contentsDateTimeExample').classList.remove('textColorError');
    document.getElementById('contentsDateTimeExample').textContent = dateTimeString;
    LocalStorageManager.setValue_async('dateTimeOptions', contentsDateTimeOptions);
  }

  async _contentsDateTimeResetButtonClicked_event() {
    document.getElementById('contentsDateTimeFormat').value = JSON.stringify(DefaultValues.dateTimeOptions);
    this._contentsDateTimeFormatOnchange_event();
  }

  _enableItemOptions() {
    let enabled = document.getElementById('renderFeedsCheckbox').checked;
    this._enableCheckbox('itemNewTabCheckbox', 'textItemNewTab', enabled);
    this._enableCheckbox('alwaysOpenNewTabCheckbox', 'textAlwaysOpenNewTab', enabled);
    this._enableCheckbox('openNewTabForegroundCheckbox', 'textOpenNewTabForeground', enabled);
    this._enableCheckbox('reuseDropFeedsTabCheckbox', 'textReuseDropFeedsTab', enabled && document.getElementById('alwaysOpenNewTabCheckbox').checked);
  }

  _enableCheckbox(checkboxId, textId, enabled) {
    document.getElementById(checkboxId).disabled = !enabled;
    CssManager.setElementEnableById(checkboxId, enabled);
    CssManager.setElementEnableById(textId, enabled);
  }
}
