<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Bookstore</title>
        <link rel="stylesheet" href="<% asset('assets/style.css') %>">
    </head>
    <body ng-app="bookstore" ng-cloak>
        <div class="container-fluid">
            <h1>Bookstore</h1>
            <a href="books">Books</a>

            <div class="row" ng-view>
            </div>
        </div>

        <script src="<% asset('js/all.js') %>"></script>
        <script src="<% asset('assets/bookstore.js') %>"></script>
    </body>
</html>
