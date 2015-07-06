(function() {
  'use strict';

  angular.element(document).ready(function() {
    document.getElementsByTagName('body')[0].style.display = 'block';
  });

  angular.module('app', ['ngMessages']);

  angular.module('app').directive('animateOnChange', ['$animate', '$timeout', function($animate, $timeout) {
    return function(scope, elem, attr) {
      scope.$watchCollection(attr.animateOnChange, function(newValues, oldValues) {
        if(!newValues){
          $animate.removeClass(elem, 'info');
          return;
        }else{
          $animate.addClass(elem, 'info');
        }

        $animate.addClass(elem, 'changed').then(function() {
          $animate.addClass(elem, 'info');
          $timeout(function(){
            $animate.removeClass(elem, 'changed');
          }, 0);
        });
      });
    };
  }]);

  angular.module('app').directive('scrollToBottom', ['$timeout', function($timeout) {
    return function(scope, elem, attr) {
      scope.$watchCollection(attr.scrollToBottom, function(){
        $timeout(function() {
          elem.animate({scrollTop: elem.offset().top}, 'slow');
        });
      })
    };
  }]);

  angular.module('app').directive('availableInArray', ['$q', function($q){
    return {
      require: 'ngModel',
      scope: {
        availableInArray: '=',
        ngModel: '='
      },
      link: function(scope, elm, attrs, ctrl) {
        ctrl.$asyncValidators.availableInArray = function(modelValue, viewValue) {
          if(!scope.availableInArray || !modelValue){
            return $q.when();
          }
          var numbers = modelValue.split(' ');
          for(var i in numbers){
            if(parseInt(numbers[i]) >= scope.availableInArray.length){
              return $q.reject();
            }
          }

          return $q.when();
        };

        scope.$watch('availableInArray', function() {
          ctrl.$validate();
        });
      }
    };
  }]);

  angular.module('app').controller('MemoryController', ['$scope', '$timeout', function($scope, $timeout) {
    $scope.finishJob = true;
    $scope.logs = [];

    $scope.dirtyAndInvalidClass = function(field){
      if(($scope.setupForm[field].$dirty || $scope.setupForm[field].$touched) && $scope.setupForm[field].$invalid){
        return 'has-error';
      }
    };

    $scope.$watchGroup(['setup.memoryCacheNumberLines', 'setup.memoryCacheN'],function(newValues, oldValues){
      _caculateMC();
    });

    var _caculateMC = function(){
      if($scope.setupForm.memoryCacheNumberLines.$valid && $scope.setupForm.memoryCacheN.$valid){
        $scope.lines = new Array($scope.setup.memoryCacheNumberLines); // linhas da MC
        $scope.groupLines = new Array(Math.ceil($scope.setup.memoryCacheNumberLines / $scope.setup.memoryCacheN));
        $scope.numberLinesEachGroup = new Array($scope.setup.memoryCacheN);
      }
    };

    $scope.$watchGroup(['setup.mainMemorySize', 'setup.mainMemoryBlockSize'],function(newValues, oldValues){
      _caculateMP();
    });

    var _caculateMP = function(){
      if($scope.setupForm.mainMemorySize.$valid && $scope.setupForm.mainMemoryBlockSize.$valid){
        var number_of_blocks = Math.ceil($scope.setup.mainMemorySize / $scope.setup.mainMemoryBlockSize);
        if(!$scope.blocks || $scope.blocks.length != number_of_blocks){
          $scope.blocks = new Array(number_of_blocks);
        }
      }
    };

    $scope.canShowLineBlock = function(lineGroup, lineNumber){
      var line = $scope.lines[(lineGroup * $scope.numberLinesEachGroup.length) + lineNumber];
      return line && typeof line.block != 'undefined';
    };

    $scope.isEmptyMainMemory = function(){
      return !$scope.blocks || $scope.blocks.length == 0;
    };

    $scope.isEmptyMemoryCache = function(){
      return !$scope.lines || $scope.lines.length == 0;
    };

    $scope.lineByGroupAndLineGroupNumber = function(lineGroup, lineNumber){
      return $scope.lines[(lineGroup * $scope.numberLinesEachGroup.length) + lineNumber];
    };

    $scope.currentLine = function(lineGroup, lineNumber){
      var line = $scope.lines[(lineGroup * $scope.numberLinesEachGroup.length) + lineNumber];
      return line ? line : {};
    };

    $scope.runSequence = function(setup){
      _configure();

      if(setup.runOnceAllBlocks){
        _runWorkerOnce();
      }else{
        _runWorkerStepByStep();
      }
    };

    $scope.restart = function(){
      $scope.setupForm.$setPristine();

      $scope.configured = false;
      $scope.sequence = [];
      $scope.blocks = [];
      $scope.lines = [];
      $scope.finishJob = true;
      $scope.emptySequence = false;

      _caculateMC();
      _caculateMP();

      $scope.logs = [];
    };

    var _configure = function(){
      if(!$scope.configured){
        $scope.sequence = $scope.formatSequence();
        $scope.configured = true;
      }
    };

    $scope.formatSequence = function(){
      var sequence = $scope.setup.sequenceBlocks.split(' ');
      if($scope.setup.sequenceBlocks.match(/[^(\d| )]/g) != null){
        return;
      }

      return _formatInputSequence(sequence);
    };

    var _formatInputSequence = function(sequence){
      for(var i = 0, len = sequence.length; i < len; i++){
        sequence[i] = parseInt(sequence[i]);
      }

      return sequence;
    };

    var _runWorkerOnce = function(){
      if($scope.finishJob){
        $scope.getFromMC($scope.sequence.shift());
      }
      if($scope.sequence.length > 0){
        $timeout(_runWorkerOnce, 0);
      }
    };

    var _runWorkerStepByStep = function(){
      if($scope.finishJob){
        $scope.getFromMC($scope.sequence.shift());
        if($scope.sequence.length == 0){
          $scope.emptySequence = true;
        }else{
          $scope.emptySequence = false;
        }
      }
    };

    $scope.getFromMC = function(blockNumber){
      $scope.finishJob = false;
      var toLineGroup = blockNumber % $scope.groupLines.length;
      var startPoint = toLineGroup * $scope.numberLinesEachGroup.length;
      var endPoint = (toLineGroup + 1) * $scope.numberLinesEachGroup.length;

      var notUsedIndex = -1;
      var leastRecentlyUsedAt = Number.MAX_VALUE;
      var leastRecentlyUsedIndex = -1;

      for (var i = startPoint; i < endPoint; i++) {
        if($scope.lines[i]){
          if($scope.lines[i].block == blockNumber){
            $scope.logs.push({block: blockNumber, group: toLineGroup, groupLine: (i - startPoint), line: i, type: 'exist'});
            _jobFinish(1000);
            return $scope.lines[i].usedAt = performance.now();
          }else if(leastRecentlyUsedAt > $scope.lines[i].usedAt){
            leastRecentlyUsedAt = $scope.lines[i].usedAt;
            leastRecentlyUsedIndex = i;
          }
        }else{
          notUsedIndex = notUsedIndex > -1 ? notUsedIndex : i;
        }
      }

      $scope.cursor = {blockNumber: blockNumber, notUsedIndex: notUsedIndex, leastRecentlyUsedIndex: leastRecentlyUsedIndex};

      $scope.blocks[blockNumber] = {usedAt: performance.now()};

      $timeout($scope.addBlockToMC, 1000);
    };

    $scope.addBlockToMC = function(){
      if($scope.cursor.notUsedIndex > -1){
        var toLineGroup = $scope.cursor.notUsedIndex / $scope.numberLinesEachGroup.length;
        var groupLine = $scope.cursor.notUsedIndex % $scope.numberLinesEachGroup.length;
        $scope.logs.push({block: $scope.cursor.blockNumber, group: Math.floor(toLineGroup), groupLine: groupLine, line: $scope.cursor.notUsedIndex, type: 'allocated'});
        $scope.lines[$scope.cursor.notUsedIndex] = {usedAt: performance.now(), block: $scope.cursor.blockNumber};
      }else{
        var toLineGroup = $scope.cursor.leastRecentlyUsedIndex / $scope.numberLinesEachGroup.length;
        var groupLine = $scope.cursor.leastRecentlyUsedIndex % $scope.numberLinesEachGroup.length;
        $scope.logs.push({block: $scope.cursor.blockNumber, group: Math.floor(toLineGroup), groupLine: groupLine, line: $scope.cursor.leastRecentlyUsedIndex, type: 'overwritten', oldBlock: $scope.lines[$scope.cursor.leastRecentlyUsedIndex].block});
        $scope.lines[$scope.cursor.leastRecentlyUsedIndex] = {usedAt: performance.now(), block: $scope.cursor.blockNumber};
      }

      _jobFinish(1000);
    };

    var _jobFinish = function(time){
      $timeout(function(){$scope.finishJob = true;}, time);
    };
  }]);
})();
