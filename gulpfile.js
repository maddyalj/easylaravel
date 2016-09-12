const elixir = require('laravel-elixir');

/*
 |--------------------------------------------------------------------------
 | Elixir Asset Management
 |--------------------------------------------------------------------------
 |
 | Elixir provides a clean, fluent API for defining some basic Gulp tasks
 | for your Laravel application. By default, we are compiling the Sass
 | file for our application, as well as publishing vendor resources.
 |
 */

elixir(mix => {
    mix.scripts([
        '../../../node_modules/angular/angular.js',
        '../../../node_modules/angular-route/angular-route.js',
        '../../../node_modules/angularrest/src/angularrest.js',
    ]);
});
