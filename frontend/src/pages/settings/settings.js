import { Notify, Dialog } from 'quasar'

import SettingsService from '@/services/settings'
import UserService from '@/services/user'

import LanguageSelector from '@/components/language-selector';

export default {
    data() {
        return {
            loading: true,
            UserService: UserService,
            settings: {},
            settingsOrig : {},
            canEdit: false,
            highlightPalette: [
                '#ffff25', '#00ff41', '#00ffff', '#ff00f9', '#0005fd',
                '#ff0000', '#000177', '#00807a', '#008021', '#8e0075',
                '#8f0000', '#817d0c', '#807d78', '#c4c1bb', '#000000'
            ]
        }
    },
    components: {
        LanguageSelector
    },

    beforeRouteLeave (to, from , next) {
        if (this.unsavedChanges()) {
            Dialog.create({
            title: this.$t('msg.thereAreUnsavedChanges'),
            message: this.$t('msg.doYouWantToLeave'),
            ok: {label: this.$t('btn.comfirm'), color: 'negative'},
            cancel: {label: this.$t('btn.cancel'), color: 'white'}
            })
            .onOk(() => next())
        }
        else
            next()
    },

    mounted: function() {
        if (UserService.isAllowed('settings:read')) {
            this.getSettings()
            this.canEdit = this.UserService.isAllowed('settings:update');
            document.addEventListener('keydown', this._listener, false)
        }
        else {
            this.loading = false
        }
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateSettings();
            }
        },

        getSettings: function() {
            SettingsService.getSettings()
            .then((data) => {
                this.settings = data.data.datas;
                this.settingsOrig = this.$_.cloneDeep(this.settings);
                this.loading = false
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        updateSettings: function() {
            var min = 1;
            var max = 99;
            if(this.settings.reviews.public.minReviewers < min || this.settings.reviews.public.minReviewers > max) {
                this.settings.reviews.public.minReviewers = this.settings.reviews.public.minReviewers < min ? min: max;
            }
            SettingsService.updateSettings(this.settings)
            .then((data) => {
                this.settingsOrig = this.$_.cloneDeep(this.settings);
                this.$settings.refresh();
                Notify.create({
                    message: this.$t('msg.settingsUpdatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.message || err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        revertToDefaults: function() {
            Dialog.create({
                title: this.$t('msg.revertingSettings'),
                message: this.$t('msg.revertingSettingsConfirm'),
                ok: {label: this.$t('btn.confirm'), color: 'negative'},
                cancel: {label: this.$t('btn.cancel'), color: 'white'}
            })
            .onOk(async () => {
                await SettingsService.revertDefaults();
                this.$settings.refresh();
                this.getSettings();
                Notify.create({
                    message: this.$t('settingsUpdatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        importSettings: function(file) {
            var fileReader = new FileReader();
            fileReader.onloadend = async (e) => {
                try {
                    var settings = JSON.parse(fileReader.result);
                    if (typeof settings === 'object') {
                        Dialog.create({
                            title: this.$t('msg.importingSettings'),
                            message: this.$t('msg.importingSettingsConfirm'),
                            ok: {label: this.$t('btn.confirm'), color: 'negative'},
                            cancel: {label: this.$t('btn.cancel'), color: 'white'}
                        })
                        .onOk(async () => {
                            await SettingsService.updateSettings(settings);
                            this.getSettings();
                            Notify.create({
                                message: this.$t('msg.settingsImportedOk'),
                                color: 'positive',
                                textColor:'white',
                                position: 'top-right'
                            })
                        })
                    } else {
                        throw this.$t('err.jsonMustBeAnObject');
                    }
                }
                catch (err) {
                    console.log(err);
                    var errMsg = this.$t('err.importingSettingsError')
                    if (err.message) errMsg = this.$t('err.errorWhileParsingJsonContent',[err.message]);
                    Notify.create({
                        message: errMsg,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                }
            };
            var fileContent = new Blob(file, {type : 'application/json'});
            fileReader.readAsText(fileContent);
        },

        exportSettings: async function() {
            var response = await SettingsService.exportSettings();
            var blob = new Blob([JSON.stringify(response.data)], {type: "application/json"});
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = response.headers['content-disposition'].split('"')[1];
            document.body.appendChild(link);
            link.click();
            link.remove();
        },

        unsavedChanges() {
            return JSON.stringify(this.settingsOrig) !== JSON.stringify(this.settings);
        }
    }
}