import { Dialog, Notify, exportFile } from 'quasar';

import Breadcrumb from 'components/breadcrumb'

import TemplateService from '@/services/template'
import UserService from '@/services/user'
import Utils from '@/services/utils'

export default {
    data() {
        return {
            UserService: UserService,
            // Templates list
            templates: [],
            // Loading state
            loading: true,
            // Datatable headers
            dtHeaders: [
                {name: 'name', label: this.$t('name'), field: 'name', align: 'left', sortable: true},
                {name: 'ext', label: this.$t('extension'), field: 'ext', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'name'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            // Search filter
            search: {name: '', ext: ''},
            customFilter: Utils.customFilter,
            // Errors messages
            errors: {name: '', file: ''},
            // Selected or New Vulnerability
            currentTemplate: {
                name: '',
                file: '',
                ext: ''
            },
            templateId: ''
        }
    },

    components: {
        Breadcrumb
    },

    mounted: function() {
        this.getTemplates()
    },

    methods: {
        getTemplates: function() {
            this.loading = true
            TemplateService.getTemplates()
            .then((data) => {
                this.templates = data.data.datas
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
            })
        },

        downloadTemplate: function(row) {
            TemplateService.downloadTemplate(row._id)
            .then((data) => {
                var status = exportFile(`${row.name}.${row.ext || 'docx'}`, data.data, {type: "application/octet-stream"})
                if (!status)
                    throw (status)
            })
            .catch((err) => {
                if (err.response.status === 404) {
                    Notify.create({
                        message: this.$t('msg.templateNotFound'),
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                }
                else
                    console.log(err.response)
            })
        },

        createTemplate: function() {
            this.cleanErrors();
            if (!this.currentTemplate.name)
                this.errors.name = this.$t('msg.nameRequired');
            if (!this.currentTemplate.file)
                this.errors.file = this.$t('msg.fileRequired');
                
            if (this.errors.name || this.errors.file)
                return;

            TemplateService.createTemplate(this.currentTemplate)
            .then(() => {
                this.getTemplates();
                this.$refs.createModal.hide();
                Notify.create({
                    message: this.$t('msg.templateCreatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        updateTemplate: function() {
            this.cleanErrors();
            if (!this.currentTemplate.name)
                this.errors.name = this.$t('msg.nameRequired');
            
            if (this.errors.name)
                return;

            TemplateService.updateTemplate(this.templateId, this.currentTemplate)
            .then(() => {
                this.getTemplates();
                this.$refs.editModal.hide();
                Notify.create({
                    message: this.$t('msg.templateUpdatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        deleteTemplate: function(templateId) {
            TemplateService.deleteTemplate(templateId)
            .then((data) => {
                this.getTemplates();
                Notify.create({
                    message: data.data.datas,
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        confirmDeleteTemplate: function(row) {
            Dialog.create({
                title: this.$t('msg.confirmSuppression'),
                message: `${this.$t('template')} «${row.name}» ${this.$t('msg.deleteNotice')}`,
                ok: {label: this.$t('btn.confirm'), color: 'negative'},
                cancel: {label: this.$t('btn.cancel'), color: 'white'}
            })
            .onOk(() => this.deleteTemplate(row._id))
        },

        clone: function(row) {
            this.cleanCurrentTemplate();
            
            this.currentTemplate.name = row.name;
            this.templateId = row._id;
        },

        cleanErrors: function() {
            this.errors.name = '';
            this.errors.file = '';
        },

        cleanCurrentTemplate: function() {
            this.cleanErrors();
            this.currentTemplate = {
                name: '',
                file: '',
                ext: ''
            };
            this.templateId = ''
        },

        handleFile: function(files) {
            var file = files[0];
            var fileReader = new FileReader();

            fileReader.onloadend = (e) => {
                this.currentTemplate.file = fileReader.result.split(",")[1];
            }

            this.currentTemplate.ext = file.name.split('.').pop()
            fileReader.readAsDataURL(file);
        },

        dblClick: function(evt, row) {
            if (this.UserService.isAllowed('templates:update')) {
                this.clone(row)
                this.$refs.editModal.show()
            }     
        }
    }
}