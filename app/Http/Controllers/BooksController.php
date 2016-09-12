<?php

namespace App\Http\Controllers;

class BooksController extends Controller
{
    use \MaddyAlj\EasyController\EasyControllerTrait;

    public function __construct() {
        $this->model .= 'Book';
        // $this->perPage = 50;
    }
}
