$(function() {
    'use strict';

    // on change of nav select, redirect to selected day
    $('.wtf-pagination__select').on('change', function(){
        window.location.href = $(this).val();
    });

}());