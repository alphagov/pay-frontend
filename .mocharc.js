module.exports = {
    reporter: 'spec',
    require: ['./test/test-helpers/test-env.js', './test/test-helpers/supress-logs.js'],
    exit: true,
    timeout: 10000
}
