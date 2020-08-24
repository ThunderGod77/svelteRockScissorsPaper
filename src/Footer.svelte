<style>
    footer{
        position:absolute;
        bottom:0;
        right:0;
        margin-right: 20px;
        margin-top: -20px;
    }
    .rules{
        background:transparent;
        color: white;
    }
</style>

<footer>
    <button class="rules" on:click={()=>alert("Rock beats Scissors.\nScissors beat Paper.\nPaper beats Rock.")}>Rules</button>
</footer>