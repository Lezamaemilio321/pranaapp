var firstUl = document.querySelector('.first-ul');
var secondList = document.querySelectorAll('.second-list');
var secondUl = document.querySelector('.second-ul');

window.addEventListener('resize', checkForWidth)


function checkForWidth(){

    if (window.innerWidth <= 1030){
        for(i of secondList) {
            firstUl.appendChild(i);
        }

    } else if (window.innerWidth > 1031){
        for(i of secondList) {
            secondUl.appendChild(i);
        }
    }
}