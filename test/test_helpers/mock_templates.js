function TemplateEngine () {
}

TemplateEngine.__express = function (templatePath, templateData, next) {
  next('', JSON.stringify(templateData))
}

module.exports = TemplateEngine
