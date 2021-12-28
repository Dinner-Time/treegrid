class TreeGridUtil extends tui.Grid {
    // 생성자
    constructor(opt, level, category) {
        /**
         * tui-grid 4.2.0이상 버전에서는 contextMenu가 기본적으로 정의 되어있다.
         * 기본적으로 정의된 contextMenu를 커스텀 하기위해 null처리를 해준다.
         */
        opt.contextMenu = null;

        super(opt); // 그리드 생성

        this.opt = opt;
        this.level = level;
        this.category = category;

        /**
         * Custom ContextMenu
         *
         * 참고 : https://nhn.github.io/tui.context-menu/latest/tutorial-example01-basic
         */
        const contextMenu = document.createElement('div');
        contextMenu.id = 'contextMenu';
        this.opt.el.appendChild(contextMenu);

        // contextmenu 객체
        let menu = null;
        // 그리드 클릭 이벤트 정의
        this.on('mousedown', ({ rowKey, nativeEvent, columnName }) => {
            if (menu) menu.destroy(); // 객체가 생성되어 있을 경우 객체 삭제
            if (!columnName) return; // 그리드 내의 row가 아닌 빈 공간에 클릭했을 시 return

            switch (nativeEvent.button) {
                // 좌클릭
                case 0: {
                    if (nativeEvent.target.tagName === 'BUTTON' || nativeEvent.target.tagName === 'I') {
                        break;
                    }
                    if (columnName === this.opt.treeColumnOptions.name) {
                        // 클릭한 cell이 트리 칼럼일 경우 열고 닫기
                        if (this.getRow(rowKey)._attributes.expanded) {
                            // 열려 있는 경우
                            this.collapse(rowKey);
                        } else {
                            // 닫혀 있는 경우
                            this.expand(rowKey);
                        }
                    }
                    break;
                }
                // 우클릭
                case 2: {
                    // contextmenu 객체 생성
                    menu = new tui.ContextMenu(contextMenu);
                    // 클릭한 셀이 마지막 level인지 체크
                    const condition = this.getDepth(rowKey) === this.level;
                    // contextmenu 생성
                    menu.register(
                        '#grid', // contextmenu를 동작 시킬 대상
                        (event) => this.clickContextMenu(rowKey, event), // callback
                        [
                            // 메뉴 정의
                            { title: '행 삭제', command: 0 },
                            {
                                title: '행 추가',
                                menu: [
                                    { title: '같은 레벨', command: 11 },
                                    {
                                        title: '자식 레벨',
                                        command: 12,
                                        disable: condition, // 클릭한 셀이 마지막 level인 경우 disable: true
                                    },
                                ],
                            },
                        ]
                    );
                    break;
                }
            }
        });

        // 그리드 수정 이벤트 정의
        this.on('editingFinish', ({ rowKey, value }) => {
            console.log(this.getRow(rowKey));
            const arr = this.getRow(rowKey)._children;
            if (arr.length) {
                arr.forEach(({ rowKey }) => {
                    console.log(rowKey);
                    this.setValue(rowKey, 'motherCode', value);
                });
            }
        });
    }

    makeTreeGrid(data) {
        const tempArr = [];

        for (let i = 0; i < this.level; i++) {
            tempArr.push([]);
        }

        data.forEach((item) => {
            item._children = [];
            item._attributes = { expanded: true };
            item[this.opt.treeColumnOptions.name] = this.category[item.depth];
            tempArr[Number(item.depth) - 1].push(item);
        });
        this.makeTreeGridData(tempArr, this.level);

        this.removeEmptyChildren(tempArr[0]);
        grid.resetData(tempArr[0]);
    }

    makeTreeGridData(arr, depth) {
        try {
            arr[depth - 1].forEach((child) => {
                arr[depth - 2].forEach((parent) => {
                    if (child.motherCode === parent.code) {
                        parent._children.push(child);
                    }
                });
            });

            this.makeTreeGridData(arr, depth - 1);
        } catch {}
    }

    removeEmptyChildren(arr) {
        arr.forEach((item) => {
            if (item._children.length === 0) {
                delete item._children;
            } else {
                this.removeEmptyChildren(item._children);
            }
        });
    }

    clickContextMenu(rowKey, { target }) {
        switch (Number(target.getAttribute('data-command'))) {
            // 행 삭제
            case 0: {
                this.removeTreeRow(rowKey);
                break;
            }
            // 같은 레벨 행 추가
            case 11: {
                if (Number(this.getRow(rowKey).depth) === 1) {
                    this.addRow(this.getRow(rowKey), true);
                } else {
                    this.addRow(this.getParentRow(rowKey));
                }
                break;
            }
            // 자식 레벨 행 추가
            case 12: {
                this.addRow(this.getRow(rowKey));
                break;
            }
        }
    }

    addRow(parentRow, isHighest = false) {
        // 필수 데이터 세팅
        const row = {};
        const depth = isHighest ? Number(parentRow.depth) : Number(parentRow.depth) + 1;
        row[this.opt.treeColumnOptions.name] = this.category[depth];
        row['motherCode'] = isHighest ? '' : parentRow.code;
        row['depth'] = depth;
        // 행 추가
        isHighest ? this.appendRow(row) : this.appendTreeRow(row, { parentRowKey: parentRow.rowKey });
    }
}

const grid = new TreeGridUtil(
    {
        el: document.getElementById('grid'),
        data: [],
        scrollX: true,
        scrollY: true,
        bodyHeight: 530,
        rowHeight: 30,
        treeColumnOptions: {
            name: 'category',
            useIcon: true,
            useCascadingCheckbox: true,
        },
        columns: [
            {
                header: '구분',
                name: 'category',
                align: 'left',
            },
            {
                header: '코드',
                name: 'code',
                align: 'left',
                editor: 'text',
            },
            {
                header: '부모 코드',
                name: 'motherCode',
                align: 'left',
            },
            {
                header: 'depth',
                name: 'depth',
            },
        ],
    },
    5,
    {
        1: '박스',
        2: '카톤',
        3: '파우치',
        4: '면체',
        5: '5단계',
    }
);

fetch('./testApi.json')
    .then((data) => data.json())
    .then((data) => {
        grid.makeTreeGrid(data);
    });
