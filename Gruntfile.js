module.exports = function(grunt){
  var sass = {
    dev: {
      options: {
        style: "expanded",
        sourcemap: true,
        includePaths: [
          'govuk_modules/govuk_template/assets/stylesheets',
          'govuk_modules/govuk_frontend_toolkit/stylesheets'
        ],
        outputStyle: 'expanded'
      },
      files: [{
        expand: true,
        cwd: "app/assets/sass",
        src: ["*.scss"],
        dest: "public/stylesheets/",
        ext: ".css"
      }]
    }
  };

  var copy = {
    assets: {
      files: [{
        expand: true,
        cwd: 'app/assets/',
        src: ['**/*', '!sass/**'],
        dest: 'public/'
      }]
    },
    govuk: {
      files: [{
        expand: true,
        cwd: 'node_modules/govuk_frontend_toolkit',
        src: '**',
        dest: 'govuk_modules/govuk_frontend_toolkit/'
      },
      {
        expand: true,
        cwd: 'node_modules/govuk_template_mustache/',
        src: '**',
        dest: 'govuk_modules/govuk_template/'
      }]
    },
  };

  var replace = {
    fixSass: {
      src: ['govuk_modules/govuk_template/**/*.scss', 'govuk_modules/govuk_frontend_toolkit/**/*.scss'],
      overwrite: true,
      replacements: [{
        from: /filter:chroma(.*);/g,
        to: 'filter:unquote("chroma$1");'
      }]
    }
  };

  var watch = {
    css: {
      files: ['app/assets/sass/**/*.scss'],
      tasks: ['sass'],
      options: {
        spawn: false,
      }
    },
    assets:{
      files: ['app/assets/**/*', '!app/assets/sass/**'],
      tasks: ['copy:assets'],
      options: {
        spawn: false,
      }
    },
    forBrowsifier:{
      files: ['app/*','app/**/*'],
      tasks: ['browserify'],
      options: {
        spawn: false
      }
    }
  };

  var nodeMon = {
    dev: {
      script: 'server.js',
      options: {
        ext: 'js',
        ignore: ['node_modules/**', 'app/assets/**', 'public/**'],
        args: grunt.option.flags()
      }
    }
  };

  var concurrent = {
    target: {
    tasks: ['watch', 'nodemon'],
      options: {
        logConcurrentOutput: true
      }
    }
  };

  var mochaTest = {
    test: {
      options: {
        reporter: 'spec',
        captureFile: 'mocha-test-results.txt'
      },
      src: [
        'test/*.js',
        'test/unit/*.js',
        'test/services/*.js',
        'test/models/*.js',
        'test/utils/*.js',
        'test/middleware/*.js'
      ]
    }
  };

  var env = {
    test: {
    src: "config/test-env.json"
    }
  };

  var browserify = {
    "public/javascripts/browsered.js": ['app/browsered.js'],
    options: {
      browserifyOptions: { standalone: "module" }
    }
  };

  var nightwatch = {
    options: {
      src_folders: ['test/integration/tests'],
      standalone: true,
      "page_objects_path": 'test/integration/pages',
      test_workers:  {"enabled" : false, "workers" : 5},
      test_settings: {
        default: {
          "desiredCapabilities" : {
            "browserName" : "phantomjs",
            "javascriptEnabled" : true,
            "acceptSslCerts" : true,
            "phantomjs.binary.path" : "/usr/local/bin/phantomjs",
          }
        }

      }
    }
  };

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
    mochaTest: mochaTest,
    env: env,
    browserify: browserify,
    nightwatch: nightwatch


  });


  [
    'grunt-contrib-copy',
    'grunt-contrib-watch',
    'grunt-contrib-clean',
    'grunt-sass',
    'grunt-nodemon',
    'grunt-text-replace',
    'grunt-concurrent',
    'grunt-mocha-test',
    'grunt-env',
    'grunt-browserify',
    'grunt-nightwatch'

  ].forEach(function (task) {
    grunt.loadNpmTasks(task);
  });


  grunt.registerTask(
    'convert_template',
    'Converts the govuk_template to use mustache inheritance',
    function () {
      var script = require(__dirname + '/lib/template-conversion.js');

      script.convert();
      grunt.log.writeln('govuk_template converted');
    }
  );

  grunt.registerTask('generate-assets', [
    'clean',
    'copy',
    'convert_template',
    'replace',
    'sass',
    'browserify'
  ]);

  grunt.registerTask('test', ['env:test','generate-assets', 'mochaTest']);

  grunt.registerTask('default', [
    'generate-assets',
    'concurrent:target'
  ]);

  grunt.event.on('watch', function(action, filepath, target) {

    // just copy the asset that was changed, not all of them
    if (target == "assets"){
      grunt.config('copy.assets.files.0.src', filepath.replace("app/assets/",""));
    }
  });

};
