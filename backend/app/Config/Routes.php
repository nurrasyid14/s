<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

$routes->get('/', 'Home::index');

$routes->group('api', function ($routes) {

    $routes->group('auth', function ($routes) {
        $routes->post('register/user', 'AuthController::registerUser');
        $routes->post('login', 'AuthController::login');
        $routes->post('logout', 'AuthController::logout', ['filter' => 'authRole']);
    });

    $routes->group('complaints', function ($routes) {
        $routes->get('my', 'ComplaintController::my', ['filter' => 'authRole:user,stakeholder,admin']);
        $routes->get('', 'ComplaintController::index', ['filter' => 'authRole:stakeholder,admin']);
        $routes->get('(:num)', 'ComplaintController::show/$1', ['filter' => 'authRole:user,stakeholder,admin']);
        $routes->post('', 'ComplaintController::create', ['filter' => 'authRole:user,stakeholder,admin']);
        $routes->patch('(:num)/status', 'ComplaintController::updateStatus/$1', ['filter' => 'authRole:stakeholder,admin']);
        $routes->post('(:num)/reply', 'ComplaintController::reply/$1', ['filter' => 'authRole:stakeholder,admin']);
        $routes->get('(:num)/replies', 'ComplaintController::replies/$1', ['filter' => 'authRole:stakeholder,admin']);
        $routes->post('(:num)/analyze', 'ComplaintController::analyze/$1', ['filter' => 'authRole:stakeholder,admin']);
    });

    $routes->group('reviews', ['filter' => 'authRole:stakeholder,admin'], function ($routes) {
        $routes->get('pending', 'ReviewController::pending');
        $routes->post('(:num)', 'ReviewController::submit/$1');
        $routes->get('(:num)', 'ReviewController::show/$1');
    });

    $routes->group('analytics', ['filter' => 'authRole:stakeholder,admin'], function ($routes) {
        $routes->get('summary', 'AnalyticsController::summary');
        $routes->get('trend', 'AnalyticsController::trend');
        $routes->get('distribution', 'AnalyticsController::distribution');
        $routes->get('sentiment', 'AnalyticsController::sentiment');
        $routes->get('issues', 'AnalyticsController::issues');
        $routes->get('sla', 'AnalyticsController::sla');
        $routes->get('units', 'AnalyticsController::units');
        $routes->get('urgent', 'AnalyticsController::urgent');
    });
});
