var gulp = require('gulp');
gulp.task("watch", function () {
    console.log("watching");
    gulp.watch('src/*.*', gulp.series('less'));
    gulp.watch('dist/css/*.css', gulp.series('minify-css'));
    gulp.watch('js/*.js', gulp.series("minify-js"));
    gulp.watch('templates/**/*.*', gulp.series('html'));
    // Reloads the browser whenever HTML or JS files change
    gulp.watch('dist/js/*.js', gulp.series('reload'));
    gulp.watch('dist/css/*.css', gulp.series('reload'));
    gulp.watch('dist/pages/*.*', gulp.series('reload'));

})
gulp.task('test',function(){
    
})