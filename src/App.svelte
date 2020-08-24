<script>
    import Heading from './Heading.svelte'
    import CBody from './ChoosingBody.svelte'
    import Footer from './Footer.svelte'
    import RBody from './ResultBody.svelte'
    let player1 ="";
    let player2 ="";
    let score = 0;
    let choosing = true;
    let showResult = false;
    let result;
    function play(e){
        const symbol = e.detail.symbol;
        console.log(symbol)
        let randomNum = Math.floor(Math.random() * (3));
        randomNum = Math.min(randomNum,2);
        let set = ["rock","paper","scissors"]
        let index = set.indexOf(symbol);
        player2=set[randomNum]
        player1=set[index]
        if(index===randomNum){
            score = score+0;
            console.log("draw");
            choosing=false;
            result = "DRAW"
        }
        else if((randomNum===0&&index===1)||(randomNum===1&&index===2)||(randomNum===2&&index===0)){
            score=score+1;
            console.log("won")
            choosing=false;
            result="WON"
        }
        else{
            score=score-1;
            console.log("lose");
            choosing=false;
            result="LOSE"
        }
    }

</script>

<style>
</style>
<Heading {score}/>
{#if choosing}
<CBody on:choose="{play}" />
{:else}
<RBody player1={player1} player2={player2} result="{result}" on:next={()=>{choosing=true;}}/>
{/if}
<Footer/>
