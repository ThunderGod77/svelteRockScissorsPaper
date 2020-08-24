<style>



</style>


<div class="container">
    <img on:click={()=>play("rock")} src="images/icon-rock.svg" alt="rock" class="rock" width="160px" height="160px" style="margin-top: 100px;margin-left: 400px;background-color: #f4f4f4;border-radius:65px;padding: 40px"  >
    <img on:click={()=>play("scissors")} src="images/icon-scissors.svg" alt="scissors" class="rock" width="160px" height="160px" style="margin-top: 100px;margin-left: 700px;background-color: #f4f4f4;border-radius:65px;padding:40px"  >
    <img on:click={()=>play("paper")} src="images/icon-paper.svg" alt="rock" class="paper" width="160px" height="160px" style="margin-left:850px;margin-top: 100px;background-color: #f4f4f4;border-radius:65px;padding: 40px"  >
</div>

<script>

    import {createEventDispatcher} from 'svelte'
    const dispatch = createEventDispatcher();
    function play(symbol){

        dispatch('choose',{symbol:symbol});
    }

</script>