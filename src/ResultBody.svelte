<style>
h1{
    color: #f4f4f4;
    margin-left: 810px;
    margin-right: auto;
    font-size: 120px;
    margin-top: -100px;

}
.pop{
    color: #f4f4f4;margin-left: 920px;
    margin-right: auto;
    font-size: 40px;
    margin-top: -10px;

}
.you{
    color: #f4f4f4;
    margin-left: 440px;
    margin-right: auto;
    font-size: 50px;
    margin-top: 40px;
}
.computer{
    color: #f4f4f4;
    margin-left: 1360px;
    margin-right: auto;
    font-size: 50px;
    margin-top: -90px;

}

</style>


<div class="container">
    <img  src={"images/icon-"+player1+".svg"} alt="rock" class="rock" width="160px" height="160px" style="margin-top: 100px;margin-left: 400px;background-color: #f4f4f4;border-radius:65px;padding: 40px"  >
    <img  src={"images/icon-"+player2+".svg"} alt="scissors" class="rock" width="160px" height="160px" style="margin-top: 100px;margin-left: 700px;background-color: #f4f4f4;border-radius:65px;padding:40px"  >
</div>
<h1>{result}</h1>
<h2 class="pop" on:click={()=>{
    dispatch("next")
}}>NEXT</h2>
<h2 class="you">You</h2>
<h2 class="computer">Computer</h2>
<script>
    import {createEventDispatcher} from 'svelte'
    export let player1;
    export let player2;
    export let result;
    const dispatch = createEventDispatcher();
</script>