(function() {
  'use strict';

  angular.element(document).ready(function() {
    $('body').show();
  });

  angular.module('app', [])
  .controller('MemoryController', function($scope, $timeout) {
    var vm = this;
    var MAIN_MEMORY_SIZE = 0;
    var MEMORY_GROUPS_SIZE = 0;
    var MEMORY_CACHE_LINE_SIZE = 1;
    // vm.blocksActive = [];
    vm.blocksArray = [];
    vm.linesArray = [];
    vm.lines = [];

    vm.lines = [];
    vm.groupLines = 0;
    $scope.$watchGroup(['vm.memoryCacheNumberLines', 'vm.memoryCacheN'],function(newValues, oldValues){
      if(newValues[0] > 0 && newValues[1] > 0){
        vm.lines = new Array(newValues[0]);
        vm.groupLines = new Array(Math.ceil(newValues[0] / newValues[1]));
        vm.numberLinesEachGroup = new Array(newValues[1]);
      }
    });

    vm.number_of_blocks = 0;
    vm.blocks = [];
    $scope.$watchGroup(['vm.mainMemorySize', 'vm.mainMemoryBlockSize'],function(newValues, oldValues){
      if(newValues[0] > 0 && newValues[1] > 0){
        var number_of_blocks = Math.ceil(newValues[0] / newValues[1]); // quantidade de blocos
        vm.blocks = safeNewArray(new Array(number_of_blocks), vm.blocks);
      }else{
        vm.blocks = safeNewArray(new Array(MAIN_MEMORY_SIZE), vm.blocks);
      }
    });

    vm.isEmptyMainMemory = function(){
      return vm.blocks.length == 0;
    };

    vm.isEmptyMemoryCache = function(){
      return vm.lines.length == 0;
    };

    vm.lineClass = function(lineGroup, lineNumber){
      if(vm.lines[(lineGroup * vm.numberLinesEachGroup.length) + lineNumber]){
        return "info";
      }
    };

    vm.blockClass = function(blockNumber){
      if(vm.blocks[blockNumber] == true){
        return "info";
      }
    };

    window.teste = vm;

    vm.getBlock = function(block){
      vm.addToMC(block);
    };

    vm.addToMC = function(block){
      var lineGroup = block % vm.groupLines.length;
      var start = lineGroup * vm.numberLinesEachGroup.length;
      var end = (lineGroup + 1) * vm.numberLinesEachGroup.length;

      var notUsed = -1;
      var least_recently_used_at = Number.MAX_VALUE;
      var least_recently_used_index = -1;
      for (var i = start; i < end; i++) {
        if(vm.lines[i]){
          if(vm.lines[i].block == block){
            return vm.lines[i].used_at = performance.now(); // encontrou uma linha com o bloco que está procurando
          }else if(least_recently_used_at > vm.lines[i].used_at){
            least_recently_used_at = vm.lines[i].used_at;
            least_recently_used_index = i;
          }
        }else{
          notUsed = notUsed > -1 ? notUsed : i; // encontrou uma linha vazia
        }
      }

      vm.cursor = {block: block, notUsed: notUsed, least_recently_used_index: least_recently_used_index};

      vm.blocks[block] = true;

      $timeout(vm.addBlock, 1000);
      // vm.addBlock();
    };

    vm.addBlock = function(block, notUsed, least_recently_used_index){
      // $timeout
      // vm.blocks[vm.cursor.block] = true;
      // $timeout

      if(vm.cursor.notUsed > -1){
        vm.lines[vm.cursor.notUsed] = {used_at: performance.now(), block: vm.cursor.block};
      }else{
        vm.lines[vm.cursor.least_recently_used_index] = {used_at: performance.now(), block: vm.cursor.block};
      }
    };

    vm.getBlocks = function(blocks){
      for (var i = 0, len = blocks.length; i < len; i++){
        if(blocks[i] < vm.blocks.length){
          vm.getBlock(blocks[i]);
        }
      }
    };

    vm.moveBlocks = function(){
      var numbers = vm.numbersInput.split(" ");
      if(vm.numbersInput.match(/[^(\d| )]/g) != null){
        return;
      }

      formatInputNumbers(numbers);

      vm.input = numbers;
      runWorker();
    };

    vm.currentLine = function(lineGroup, lineNumber){
      var line = vm.lines[(lineGroup * vm.numberLinesEachGroup.length) + lineNumber];
      return line ? line : {};
    };

    vm.canShowLineBlock = function(lineGroup, lineNumber){
      var line = vm.lines[(lineGroup * vm.numberLinesEachGroup.length) + lineNumber];
      return line && typeof line.block != 'undefined';
    };

    function runWorker(){
      vm.getBlock(vm.input.shift());
      if(vm.input.length > 0){
        $timeout(runWorker, 2000);
      }
    }

    function formatInputNumbers(numbers){
      for(var i = 0, len = numbers.length; i < len; i++){
        numbers[i] = parseInt(numbers[i]);
      }
    }

    function safeNewArray(newArray, oldArray){
      return vm.blocksArray.length != newArray.length ? newArray : vm.blocksArray;
    }
  });
})();
