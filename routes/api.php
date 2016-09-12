<?php

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::group([/*'middleware' => 'auth:api'*/], function () {
    Route::get('/books', 'BooksController@all');
    Route::get('/booksp', 'BooksController@paginate');
    Route::get('/books/{book}', 'BooksController@find');
    Route::post('/books', 'BooksController@create');
    Route::patch('/books/{book}', 'BooksController@update');
    Route::delete('/books/{book}', 'BooksController@delete');
});
