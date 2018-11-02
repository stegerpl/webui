import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogService, WebSocketService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { Subscription } from 'rxjs';
import { EntityUtils } from '../../../common/entity/utils';
import { T } from '../../../../translate-marker';
import { MatSnackBar } from '@angular/material';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-storage-list',
  template: `<entity-table [title]="title" [conf]="this"></entity-table>`
})
export class StorageListComponent {

  public title = "Mount points";
  protected queryCall = 'jail.fstab';
  protected queryCallOption = [];
  protected queryRes: any = [];
  protected route_add: string[] = ['jails', 'storage'];
  protected route_add_tooltip: string = "Add Mount Point";
  protected route_delete: string[] = ['jails', 'storage'];
  protected route_edit: string[] = ['jails', 'storage'];

  protected jailId: string;
  public busy: Subscription;
  protected loaderOpen: boolean = false;

  constructor(protected router: Router, protected aroute: ActivatedRoute, protected dialog: DialogService,
              protected loader: AppLoaderService, protected ws: WebSocketService, protected snackBar: MatSnackBar,
              protected translate: TranslateService) {
    this.aroute.params.subscribe(params => {
      this.jailId = params['jail'];
      this.queryCallOption.push(params['jail']);
      this.queryCallOption.push({ "action": "LIST", "source": "", "destination": "", "fstype": "", "fsoptions": "", "dump": "", "pass": "" });
      this.route_add.push(params['jail'], 'add');
      this.route_delete.push(params['jail'], 'delete');
      this.route_edit.push(params['jail'], 'edit');
    });
  }

  public columns: Array < any > = [
    { name: T('Source'), prop: 'source' },
    { name: T('Destination'), prop: 'destination' },
  ];
  public config: any = {
    paging: true,
    sorting: { columns: this.columns },
    multiSelect: true,
    deleteMsg: {
      title: 'Mount Point',
      key_props: ['source', 'destination']
    },
  };

  public multiActions: Array < any > = [{
      id: "mdelete",
      label: T("Delete"),
      icon: "delete",
      enable: true,
      ttpos: "above",
      onClick: (selected) => {
        this.doDelete(selected);
      }
    },
  ];

  public singleActions: Array < any > = [{
      id: "eddit",
      label: T("Edit"),
      icon: "edit",
      enable: true,
      ttpos: "above",
      onClick: (selected) => {
        // console.log(selected)
        // this.entityList.doMultiDelete(selected);
      }
    },
  ];

  afterInit(entityTable) {
    entityTable.doDelete = this.doDelete;
    entityTable.jailId = this.jailId;
    entityTable.dialog = this.dialog;
    this.getData = entityTable.getData;
  }

  dataHandler(entityList: any) {
    entityList.rows = [];

    if (this.queryRes[0]) {
      for (let i = 0; i < Object.keys(this.queryRes[0]).length - 1; i++) {
        if (this.queryRes[0][i].type != "SYSTEM") {
          let row = [];
          row['source'] = this.queryRes[0][i].entry[0];
          row['destination'] = this.queryRes[0][i].entry[1];
          row['fstype'] = this.queryRes[0][i].entry[2];
          row['fsoptions'] = this.queryRes[0][i].entry[3];
          row['dump'] = this.queryRes[0][i].entry[4];
          row['_pass'] = this.queryRes[0][i].entry[5];
          row['id'] = i;
          entityList.rows.push(row);
        }
      }
    }
  }

  getData () {

  }

  doDelete(item) {
    const req = [];
    for (const i of item) {
      req.push({"action": "REMOVE", "index": i.id});
    }
    console.log(req)
    let deleteMsg =  "Delete Mount Point <b>" + item['source'] + '</b>?';
    this.translate.get(deleteMsg).subscribe((res) => {
      deleteMsg = res;
    });
    this.dialog.confirm(T("Delete"), deleteMsg, false, T('Delete Mount Point')).subscribe((res) => {
      if (res) {
        this.loader.open();
        this.loaderOpen = true;
        let data = {};
        this.busy = this.ws.job('core.bulk', ['jail.fstab', [this.jailId, req ]]).subscribe(
          (res) => { this.getData() },
          (res) => {
            new EntityUtils().handleError(this, res);
            this.loader.close();
          }
        );
      }
    })
  }

  getAddActions() {
    return [{
      label: T("Go Back to Jails"),
      icon: "reply",
      onClick: () => {
        this.router.navigate(new Array('').concat(['jails']));
      }
    }];
  }

  doAdd() {
    this.ws.call('jail.query', [
      [
        ["host_hostuuid", "=", this.jailId]
      ]
    ]).subscribe((res) => {
      if (res[0] && res[0].state == 'up') {
        this.snackBar.open(this.jailId + " should not be running when adding a mountpoint.", 'close', { duration: 5000 });
      } else {
        this.router.navigate(new Array('/').concat(this.route_add));
      }
    })
  }
}
