var gulp = require('gulp');
var tsc = require('gulp-typescript');
var es  = require('event-stream');
var sourcemaps = require("gulp-sourcemaps");
var Path = require("path");
var del = require("del");
var mocha = require('gulp-mocha');

options = {

};

var create_empty_stream = function(){
    return gulp.src([]);
}

var compile_typescript = function (outputDir,tsConfigPath){
    outputDir = outputDir || ".";
    tsConfigPath = tsConfigPath || Path.join(outputDir,"tsconfig.json");

    var tsProject = tsc.createProject("tsconfig.json", { rootDir: __dirname });


    var tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject());

    return es.merge(
        tsResult.pipe(gulp.dest(outputDir)),
        tsResult.dts.pipe(gulp.dest(outputDir)),
        tsResult.js.pipe(sourcemaps.write(outputDir,{sourceRoot: function(file){return file.cwd;}})).pipe(gulp.dest(outputDir))
    );
};

var cleanup_directory = function(outputDir,additionalIgnoredAssets){
    var assets_to_delete = [
        "lib/**/*.js",
        "lib/**/*.d.ts",
        "lib/**/*.map",
        "*.d.ts",
        "*.js",
        "*.js.map",
    ];
    outputDir = outputDir || ".";
    
    //joins the output dir as a prefix to the assets to delete during clean.
    assets_to_delete = assets_to_delete.map(function(asset){
        return Path.join(outputDir,asset);
    });

    additionalIgnoredAssets = additionalIgnoredAssets || [];
    additionalIgnoredAssets = additionalIgnoredAssets.concat(["Gulpfile.js"]);

    //adds the ! as prefix to all the additional cleanup directories.
    additionalIgnoredAssets = additionalIgnoredAssets.map(function(ignoredAsset){
        return "!" + Path.join(outputDir,ignoredAsset);
    });

    return del(assets_to_delete.concat(additionalIgnoredAssets));
};

var run_unittests = function(testPattern,reporter,use_code_coverage){
    reporter = "dot";
    testPattern = './test/**/*tests.js';
    
    var testPreprocessing = create_empty_stream();
    //in case of code coverage we need to perform hooking to the code.
    if(use_code_coverage){
        testPreprocessing = gulp.src(['lib/**/*.js'])
        // Covering files
        .pipe(istanbul())
        // Force `require` to return covered files
        .pipe(istanbul.hookRequire());
    }
    
    testPreprocessing = es.merge(testPreprocessing,gulp.src(testPattern, {read: false}));
    
    var testPostProcessing = create_empty_stream();

    return testPreprocessing
        // gulp-mocha needs filepaths so you can't have any plugins before it
        .pipe(mocha({reporter: reporter}))
        .pipe(testPostProcessing);
}
   
gulp.task("test",[],function(){
    return run_unittests(options.testPattern,options.reporter,options.use_code_coverage);
});

gulp.task("clean",function(){
    return cleanup_directory(options.outputDir,options.additionalIgnoredAssets);
});

gulp.task("compile", ["clean"],function(){
    return compile_typescript(options.outputDir,options.tsConfigPath);
});
gulp.task('build', ['compile']);
gulp.task("dev", ["build"], function(){
    return run_unittests(options.testPattern,options.reporter,options.use_code_coverage);
});

// Default Task
gulp.task("default",["dev"]);
