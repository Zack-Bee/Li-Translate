const gulp = require("gulp");
const changed = require("gulp-changed");
const cleanCSS = require('gulp-clean-css');
const pump = require('pump');

const DIST = "./dist";
const SRC = "./src/!(js)/*";

gulp.task("move", function () {

    // 将html,manifest移到dist
    gulp.src("./src/*.html").
        pipe(gulp.dest(DIST));
    gulp.src("./src/manifest.json").
        pipe(gulp.dest(DIST));
    
    // 移动icon,img
    gulp.src("./src/icons/*.png").
        pipe(gulp.dest(DIST + "/icons"));
    gulp.src("./src/img/*.png").
        pipe(gulp.dest(DIST + "/img"));
});

gulp.task('compressCss', function (cb) {
    pump([
        gulp.src('./src/css/*.css'),
        cleanCSS(),
        gulp.dest("./dist/css")
    ], cb);
});

gulp.task("compressJs", function (cb) {
    pump([
        gulp.src('./src/js/*.js'),
        cleanCSS(),
        gulp.dest("./dist/js")
    ], cb);
})