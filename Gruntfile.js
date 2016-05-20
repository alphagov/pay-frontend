var path = require('path');
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
        cwd: 'app/assets/images',
        src: ['*'],
        dest: 'public/images/'
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
    }
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
    assets:{
      files: ['app/assets/**/*'],
      tasks: ['generate-assets'],
      options: {
        spawn: false,
      }
    },
    forBrowsifier:{
      files: ['app/*','app/**/*'],
      tasks: ['generate-assets'],
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
        args: ["-i=true"]
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
        'test/middleware/*.js',
        'test/controllers/*.js'
      ]
    }
  };

  var jshint = {
    main: {
      files: {
        src: [
          'app/**/*.js',
          '!app/assets/**/*.js',
          '!app/utils/custom_certificate.js'

        ]
      } ,
      options: {
        jshintrc: './.jshintrc'
      }
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


  var concat =  {
    options: {
      separator: ';',
    },
    dist: {
      src: ['public/javascripts/browsered.js','app/assets/javascripts/base/*.js',
      'app/assets/javascripts/modules/*.js'],
      dest: 'public/javascripts/application.js',
    },
  };

  var rewrite = {
    "application.css": {
      src: 'public/stylesheets/application.css',
      editor: function(contents, filePath) {
        var staticify = require("staticify")(path.join(__dirname, "public"));

        return staticify.replacePaths(contents)
      }
    }
  };

  var compress = {
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
    concat: concat,
    jshint: jshint,
    rewrite: rewrite,
    compress: compress
  });


  [
    'grunt-contrib-copy',
    'grunt-contrib-compress',
    'grunt-contrib-watch',
    'grunt-contrib-clean',
    'grunt-contrib-jshint',
    'grunt-sass',
    'grunt-nodemon',
    'grunt-text-replace',
    'grunt-concurrent',
    'grunt-mocha-test',
    'grunt-env',
    'grunt-browserify',
    'grunt-contrib-concat',
    'grunt-rewrite'

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
    'browserify',
    'concat',
    'rewrite',
    'compress'
  ]);

  grunt.registerTask('test', ['env:test','generate-assets', 'mochaTest']);
  grunt.registerTask('lint', ['jshint']);


  grunt.registerTask('default', [
    'generate-assets',
    'concurrent:target'
  ]);


};
