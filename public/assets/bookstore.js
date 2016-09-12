'use strict';

var bookstore = angular.module('bookstore', ['ngRoute', 'angularrest']);

bookstore.config(function ($locationProvider, $routeProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });

    $routeProvider
        .when('/', {
        })
        .when('/books', {
            templateUrl: '/html/books.html',
            controller: 'books',
        });
});

bookstore.run(function ($rootScope) {
    $rootScope._C = {
        Account: {
            STATUSES: {
                SUSPECT:  1,
                PROSPECT: 2,
                ACTIVE:   3
            }
        }
    };
    $rootScope._L = {
        Account: {
            STATUSES: {
                1: 'Suspect',
                2: 'Prospect',
                3: 'Active'
            }
        }
    };
});

bookstore.controller('books', function ($scope, Book) {
    Book.all().then(function (data) {
        console.dir(data);
        $scope.books = data;
    });
});

bookstore.service('Book', function (AngularRest) {
    AngularRest.make(this, 'books');
});
