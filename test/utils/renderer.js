var TemplateEngine = require(__dirname + '/../../lib/template-engine.js')

module.exports = {
  renderer : function (templateName, templateData, callback) {
    var templates = TemplateEngine._getTemplates([__dirname + '/../../app/views',
                                                __dirname + '/../../govuk_modules/govuk_template/views/layouts']);
    var htmlOutput = templates[templateName].render(templateData, templates);
    callback(htmlOutput);
  }
};
