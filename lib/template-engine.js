/**
 * This file is a version of https://github.com/steveukx/hogan-middleware adapted for our requirements.
 */
const logger = require('pino')()
const async = require('async')
const path = require('path')
const hogan = require('hogan.js')
const readDir = require('readdir')
const fs = require('fs')
const staticify = require('staticify')(path.join(__dirname, '../public'))

/**
 * Stored compiled templates
 */
let compiledTemplates = {}

/**
 * Stored raw templates
 */
let rawTemplates = {}

/**
 * Stored raw file paths
 */
let rawFilePaths = {}

/**
 * Stored localisation data in string form
 */
let i18nJSON = null

/**
 * Stored localisation data in parsed form
 */
let i18nParsed = null

/**
 * Express application reference
 */
let app = null

/**
 * Forces fresh re-loads of templates/locales from file system
 */
let forceFileSystemReload = process.env.NODE_ENV !== 'production'

function TemplateEngine () {
}

/**
 * Called by the express server to get the content for a given template at the templatePath supplied. The templateData
 * can contain any content from a configured route, and will be made available to the templates.
 *
 * Templates can include partials by name for any template also in the views directory, note that if sub-directories are
 * used to create included partials, express will not necessarily recognise that file as a valid view path... you've been
 * warned.
 *
 * @param {String} templatePath Path to the template
 * @param {Object} templateData Data to give to the template
 * @param {Function} next Callback to receive two arguments, an error object and the template result.
 */
TemplateEngine.__express = function (templatePath, templateData, next) {
  const templatePaths = [templateData.settings.views, templateData.settings.vendorViews]
  let templateName
  for (let i = 0; i < templatePaths.length; i++) {
    if (templatePath.indexOf(templatePaths[i]) === 0) {
      templateName = getTemplateName(templatePaths[i], templatePath)
      break
    }
  }
  templateName = templateName || path.basename(templatePath, path.extname(templatePath))

  TemplateEngine.loadTemplates(templatePaths, function processLoadedTemplate (err, templates) {
    if (err) return next(err)

    app = require(path.join(__dirname, '/../server.js')).getApp
    templateData.jsPath = app.get('settings').getVersionedPath('/javascripts/application.js')
    templateData.cssPath = app.get('settings').getVersionedPath('/stylesheets/application.min.css')
    templateData.iframeCssPath = app.get('settings').getVersionedPath('/stylesheets/iframe.css')

    if (forceFileSystemReload || !i18nJSON || !i18nParsed) {
      fs.readFile('./locales/en.json', {encoding: 'utf-8'}, function handleLocalesRead (err, data) {
        if (err) return next(err)

        i18nJSON = data
        i18nParsed = JSON.parse(i18nJSON)

        templateData.i18n = i18nParsed
        templateData.i18nAsString = i18nJSON

        const {error, output} = renderTemplate(templateName, templateData, templates)
        next(error, output)
      })
    } else {
      templateData.i18n = i18nParsed
      templateData.i18nAsString = i18nJSON
      const {error, output} = renderTemplate(templateName, templateData, templates)
      next(error, output)
    }
  })
}

TemplateEngine.loadTemplates = function (templatePaths, callback) {
  async.each(templatePaths, function iterateTemplatePath (templatePath, callbackTemplatePath) {
    const storeTemplatePartial = storeTemplate(templatePath)
    if (!forceFileSystemReload && rawFilePaths[templatePath]) {
      async.each(rawFilePaths[templatePath],
                storeTemplatePartial,
                function handleStoredDirErr (err) {
                  if (err) {
                    logger.error('ERROR: ' + err.message)

                    return callbackTemplatePath(err.message, null)
                  } else {
                    return callbackTemplatePath(null, compiledTemplates)
                  }
                })
    } else {
      readDir.read(templatePath, ['**.html', '**.mustache'], readDir.ABSOLUTE_PATHS, function readTemplatePath (err, allFiles) {
        if (err) {
          logger.error('ERROR: ' + err.message)

          return callback(err)
        } else {
          async.each(allFiles,
              storeTemplatePartial,
              function handleReadDirErr (err) {
                if (err) {
                  logger.error('ERROR: ' + err.message)

                  return callbackTemplatePath(err.message)
                } else {
                  rawFilePaths[templatePath] = allFiles
                  callbackTemplatePath(null, compiledTemplates)
                }
              })
        }
      })
    }
  }, function callbackTemplatePaths (err) {
    if (err) {
      logger.error('ERROR: ' + err.message)

      return callback(err.message, null)
    } else {
      callback(null, compiledTemplates)
    }
  })
}

/**
 * Returns the output of a compiled hogan template against given object data
 *
 * @param {String} templateName
 * @param {Object} templateData
 * @param {Object} templates
 * @returns {Object}
 * @private
 */
function renderTemplate (templateName, templateData, templates) {
  try {
    const theTemplate = templates[templateName]
    let rendered = theTemplate.render(templateData, templates)
    return {error: null, output: staticify.replacePaths(rendered)}
  } catch (err) {
    logger.error(`Error rendering template: ${err}`)

    return {error: err, output: null}
  }
}

/**
 * Remove the base path from a template path, and the extension to generate the template name
 *
 * @param {String} basePath
 * @param {String} templatePath
 * @returns {String}
 * @private
 */
function getTemplateName (basePath, templatePath) {
  const relativePath = path.relative(basePath, templatePath)
  return path.join(path.dirname(relativePath), path.basename(templatePath, path.extname(templatePath)))
}

/**
 * Return a partially applied function that stores an individual template based on the supplied path, the name of the template is the
 * file's relative path without the extension.
 *
 * @param basePath
 * @returns {Function}
 * @private
 */
function storeTemplate (basePath) {
  return function partialStoreTemplate (templatePath, callback) {
    const templateName = getTemplateName(basePath, templatePath)
    if (!forceFileSystemReload && rawTemplates[templateName]) {
      compiledTemplates[templateName] = hogan.compile(rawTemplates[templateName])
      return callback(null)
    }
    fs.readFile(templatePath, {encoding: 'utf-8'}, function handlePartialReadTemplate (err, data) {
      if (err) {
        logger.error('ERROR: ' + err.message)

        callback(err)
      } else {
        compiledTemplates[templateName] = hogan.compile(data)
        rawTemplates[templateName] = data
        callback(null)
      }
    })
  }
}

module.exports = TemplateEngine
