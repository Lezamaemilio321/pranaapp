var stripe = Stripe('pk_test_51H8U0PDJkyUQj3aZXiUP678UXs7ksLAhKJ15HuqgGwGJ4QofqDQpWQlMBSedKmw5CSqdy0UifBH7FR16xtPlqMCi00ENMwSG12');


let purchaseButton = document.querySelector('.btn-purchase');
        
let buyConfirmButtons = document.querySelectorAll('.buy-confirm');

let buyNowButtons = document.querySelectorAll('.buy-now-button');


if (purchaseButton && buyNowButtons) {

    for (let btn of buyNowButtons) {
        btn.addEventListener('click', function() {
            purchaseClicked(this);
            this.disabled = true;
        });
    }

    purchaseButton.addEventListener('click', function() {
        purchaseClicked(this);
        this.disabled = true;
    });

} else if (buyConfirmButtons) {

    for (let btn of buyConfirmButtons) {

        btn.addEventListener('click', function() {
            purchaseClicked(this);
            this.disabled = true;
        });

    }

}



function purchaseItemHook(value = null, singleObject = null, cartArray = null) {

    if (value && singleObject) {
            
        fetch('/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                item_id: value,
                item_info: singleObject
            })
        })
        .then(res => {
            return res.json();
        }).then(data => {

            const sessionID = data.session_id;

            stripe.redirectToCheckout({sessionId: sessionID});


        }).catch(error => alert('Perdon, hubo un error'));

    } else if (cartArray) {

        fetch('/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                cartArray: cartArray
            })
        })
        .then(res => {
            return res.json();
        }).then(data => {
    
            const sessionID = data.session_id;
    
            stripe.redirectToCheckout({sessionId: sessionID});
    
    
        }).catch(error => alert('Perdon, hubo un error'));

    }
}



function purchaseClicked(target = null) {

    const menuDivs = document.querySelectorAll('.menu');

    const itemFinishObjs = [];
    
    for (let menu of menuDivs) {

        const itemFinishes = menu.querySelectorAll('#finish-id');

        let finish;

        for (let item of itemFinishes) {

            if (item.checked == true) {
                finish = item.value;
                break;
            }
        }


        const quantity = menu.querySelector("input[name='itemQty']").value;

        if (quantity <= 0) {

            alert('Solo se pueden insertar numeros positivos')
            return null;
        }

        itemFinishObjs.push({ id: menu.id, finish: finish, qty: quantity });

    };


    let itemInfo;

    if (target.value) {

        itemInfo = itemFinishObjs.find(el => el.id == target.value);
        purchaseItemHook(target.value, itemInfo);

    } else if (target.dataset.myItemId) {

        itemInfo = itemFinishObjs.find(el => el.id == target.dataset.myItemId);
        purchaseItemHook(target.dataset.myItemId, itemInfo);


    } else {
        purchaseItemHook(null, null, itemFinishObjs);
    }



}