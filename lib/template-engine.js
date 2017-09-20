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

function TemplateEngine () {
}

/**
 * Stored compiled templates
 */

TemplateEngine.__compiledTemplates = {}

/**
 * Stored localisation data
 */

TemplateEngine._i18n = null

/**
 * Express application reference
 */

TemplateEngine._app = null

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
    logger.info('TemplateEngine.__express()')
    const templatePaths = [templateData.settings.views, templateData.settings.vendorViews]
    let templateName

    for (let i = 0; i < templatePaths.length; i++) {
        if (templatePath.indexOf(templatePaths[i]) === 0) {
            templateName = TemplateEngine._getTemplateName(templatePaths[i], templatePath)

            break
        }
    }

    if (!templateName) {
        templateName = path.basename(templatePath, path.extname(templatePath))
    }

    TemplateEngine._loadTemplates(templatePaths, function(err, templates) {
        if (err) {
            return next(err, null)
        }

        logger.info(`Got ${Object.keys(templates).length} template(s)`)

        if (process.env.NODE_ENV !== 'production' || !TemplateEngine._i18n || !TemplateEngine._app) {
            logger.warn('Loading locales and express server reference')
            TemplateEngine._i18n = fs.readFileSync('./locales/en.json', 'utf8')
            TemplateEngine._app = require(path.join(__dirname, '/../server.js')).getApp
        }

        templateData.i18n = JSON.parse(TemplateEngine._i18n)
        templateData.i18nAsString = TemplateEngine._i18n
        templateData.jsPath = TemplateEngine._app.get('settings').getVersionedPath('/javascripts/application.js')
        templateData.cssPath = TemplateEngine._app.get('settings').getVersionedPath('/stylesheets/application.min.css')
        templateData.iframeCssPath = TemplateEngine._app.get('settings').getVersionedPath('/stylesheets/iframe.css')

        const {error, output} = TemplateEngine._renderTemplate(templateName, templateData, templates)
        next(error, output)
    })
}

TemplateEngine._loadTemplates = function (templatePaths, callback) {
    logger.info('TemplateEngine._loadTemplates()')

        async.each(templatePaths, function(templatePath, callbackTemplatePath) {
            logger.info(`Iterating templatePath: ${templatePath}`)
            const storeTemplatePartial = TemplateEngine._storeTemplate(templatePath)
            readDir.read(templatePath, ['**.html', '**.mustache'], readDir.ABSOLUTE_PATHS, function (err, allFiles) {
                if (err) {
                    logger.error('Error reading directories: ${err}')
                    return callback(err)
                }
                logger.info(`Got ${allFiles.length} files to process`)
                logger.info(`Files : ${JSON.stringify(allFiles)}`)
                async.each(allFiles,
                    storeTemplatePartial,
                    function(err) {
                        if(err) {
                            logger.error(err.message)
                            return callbackTemplatePath(err.message, null)
                        }
                        logger.info(`_loadTemplates for ${templatePath} callback`)
                        callbackTemplatePath(null, TemplateEngine.__compiledTemplates)
                    })
            })
        }, function(err) {
            if (err) {
                logger.error(err.message)
                return callback(err.message, null)
            }
            logger.info(`Finished processing templates. Templates store has ${Object.keys(TemplateEngine.__compiledTemplates).length} template(s)`)
            callback(null, TemplateEngine.__compiledTemplates)
        })
}

TemplateEngine._renderTemplate = function (templateName, templateData, templates) {
    logger.info('TemplateEngine._renderTemplate()')

    try {
        let rendered = templates[templateName].render(templateData, templates)
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
TemplateEngine._getTemplateName = function (basePath, templatePath) {
    const relativePath = path.relative(basePath, templatePath)
    const templateName = path.join(path.dirname(relativePath), path.basename(templatePath, path.extname(templatePath)))
    return templateName
}

/**

 *
 * @param {function} templatePath
 */

/**
 * Return a partially applied function that stores an individual template based on the supplied path, the name of the template is the
 * file's relative path without the extension.
 *
 * @param basePath
 * @returns {Function}
 * @private
 */
TemplateEngine._storeTemplate = function (basePath) {
    return function (templatePath, callback) {
        logger.info(`Storing: ${templatePath}`)
        const templateName = TemplateEngine._getTemplateName(basePath, templatePath)
        fs.readFile(templatePath, {encoding: 'utf-8'}, function(err, data){
            if (err) {
                logger.error(err.message)
                return callback(err)
            }
            logger.info(`Compiling ${templateName}...`)
            TemplateEngine.__compiledTemplates[templateName] = hogan.compile(data)
            logger.info(`Compiled ${templateName}!`)
            callback(null)
        })
    }
}

module.exports = TemplateEngine
