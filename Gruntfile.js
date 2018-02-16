const path = require('path')

module.exports = function (grunt) {
  const sass = {
    dev: {
      options: {
        style: 'expanded',
        sourcemap: true,
        includePaths: [
          'govuk_modules/govuk_template/assets/stylesheets',
          'govuk_modules/govuk_frontend_toolkit/stylesheets'
        ],
        outputStyle: 'expanded'
      },
      files: [{
        expand: true,
        cwd: 'app/assets/sass',
        src: ['*.scss', 'custom/*.scss'],
        dest: 'public/stylesheets/',
        ext: '.css'
      }]
    }
  }

  const copy = {
    assets: {
      files: [{
        expand: true,
        cwd: 'app/assets/images/',
        src: ['**', '**/*'],
        dest: 'public/images/'
      }]
    },
    govuk: {
      files: [
        {
          expand: true,
          cwd: 'node_modules/govuk_frontend_toolkit',
          src: '**',
          dest: 'govuk_modules/govuk_frontend_toolkit/'
        },
        {
          expand: true,
          cwd: 'node_modules/govuk_template_jinja/',
          src: '**',
          dest: 'govuk_modules/govuk_template/',
          rename: (dest, src) => dest + src.replace('html', 'njk')
        }
      ]
    },
    payProductPage: {
      files: [{
        expand: true,
        cwd: 'node_modules/pay-product-page',
        src: ['**', '!package.json'],
        dest: 'public'
      }]
    },
    countryAutocompleteFiles: {
      files: [{
        expand: true,
        cwd: 'node_modules/govuk-country-and-territory-autocomplete/dist',
        src: '**',
        dest: 'govuk_modules/govuk-country-and-territory-autocomplete/'
      }]
    }
  }

  const cssmin = {
    target: {
      files: {
        'public/stylesheets/application.min.css': [
          'public/stylesheets/application.css', 'govuk_modules/govuk-country-and-territory-autocomplete/location-autocomplete.min.css'
        ]
      }
    }
  }

  const replace = {
    fixSass: {
      src: ['govuk_modules/govuk_template/**/*.scss', 'govuk_modules/govuk_frontend_toolkit/**/*.scss'],
      overwrite: true,
      replacements: [{
        from: /filter:chroma(.*);/g,
        to: 'filter:unquote("chroma$1");'
      }]
    }
  }

  const watch = {
    assets: {
      files: ['app/assets/**/*'],
      tasks: ['generate-assets'],
      options: {
        spawn: false,
        livereload: true
      }
    },
    forBrowsifier: {
      files: ['app/*', 'app/**/*'],
      tasks: ['generate-assets'],
      options: {
        spawn: false
      }
    }
  }

  const nodeMon = {
    dev: {
      script: 'server.js',
      options: {
        ext: 'js',
        ignore: ['node_modules/**', 'app/assets/**', 'public/**'],
        args: ['-i=true']
      }
    }
  }

  const concurrent = {
    target: {
      tasks: ['watch', 'nodemon'],
      options: {
        logConcurrentOutput: true
      }
    }
  }

  const browserify = {
    'public/javascripts/browsered.js': ['app/browsered.js'],
    options: {
      browserifyOptions: {
        standalone: 'module'
      },
      transform: [
        [
          'babelify',
          {
            presets: [
              ['env', {
                'targets': {
                  'browsers': ['last 2 versions', 'safari >= 7', 'ie >= 10']
                }
              }]
            ]
          }
        ]
      ]
    }
  }

  const concat = {
    options: {
      separator: ';'
    },
    dist: {
      src: ['public/javascripts/browsered.js', 'app/assets/javascripts/base/*.js',
        'app/assets/javascripts/modules/*.js'],
      dest: 'public/javascripts/application.js'
    }
  }

  const rewrite = {
    'application.css': {
      src: 'public/stylesheets/application.css',
      editor: function (contents) {
        const staticify = require('staticify')(path.join(__dirname, 'public'))

        return staticify.replacePaths(contents)
      }
    }
  }

  const compress = {
    main: {
      options: {
        mode: 'gzip'
      },
      files: [
        {expand: true, src: ['public/images/*.jpg'], ext: '.jpg.gz'},
        {expand: true, src: ['public/images/*.gif'], ext: '.gif.gz'},
        {expand: true, src: ['public/images/*.png'], ext: '.png.gz'},
        {expand: true, src: ['public/javascripts/*.js'], ext: '.js.gz'},
        {expand: true, src: ['public/stylesheets/*.css'], ext: '.css.gz'}
      ]
    }
  }

  grunt.initConfig({
    // Clean
    clean: ['public', 'govuk_modules'],
    // Builds Sass
    sass: sass,
    // Copies templates and assets from external modules and dirs
    copy: copy,
    // workaround for libsass
    replace: replace,
    // Watches assets and sass for changes
    watch: watch,
    // nodemon watches for changes and restarts app
    nodemon: nodeMon,
    concurrent: concurrent,
    browserify: browserify,
    concat: concat,
    rewrite: rewrite,
    compress: compress,
    cssmin: cssmin
  });

  [
    'grunt-contrib-copy',
    'grunt-contrib-cssmin',
    'grunt-contrib-compress',
    'grunt-contrib-watch',
    'grunt-contrib-clean',
    'grunt-sass',
    'grunt-nodemon',
    'grunt-text-replace',
    'grunt-concurrent',
    'grunt-browserify',
    'grunt-contrib-concat',
    'grunt-rewrite'

  ].forEach(function (task) {
    grunt.loadNpmTasks(task)
  })

  grunt.registerTask('generate-assets', [
    'clean',
    'copy',
    'replace',
    'sass',
    'browserify',
    'concat',
    'rewrite',
    'compress',
    'cssmin'
  ])

  grunt.registerTask('default', [
    'generate-assets',
    'concurrent:target'
  ])
}
