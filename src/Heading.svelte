<script>
    export let score ;
</script>


<style>
    .heading{
        border: 2px white solid;
        color: #f4f4f4;
        align-self: center;
        padding: 15px;
        margin: 15px auto;
        width: 50%;
        display: flex;
        flex-direction:row ;
        justify-content: space-between;
    }
    .score{
        background-color: #f4f4f4;
        width :20%;
        color: hsl(214, 47%, 23%);
        border-radius: 25px;
        padding: 14px;
    }
    .score h3{
        font-size: 40px;
        margin-bottom: -8px;
    }
    .score p{
        font-size: larger;
    }


</style>



<div class="heading">
    <div class="cont">
        <h2>ROCK</h2>
        <h2>PAPER</h2>
        <h2>SCISSOR</h2>
    </div>
    <div class="score">
        <h3>Score</h3>
        <p>{score}</p>
    </div>
</div>