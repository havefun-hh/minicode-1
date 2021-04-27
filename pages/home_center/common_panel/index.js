// miniprogram/pages/home_center/common_panel/index.js.js
import { getDevFunctions, getDeviceDetails, deviceControl } from '../../../utils/api/device-api'
import wxMqtt from '../../../utils/mqtt/wxMqtt'
// import Vue from 'vue';
// import { Tabbar, TabbarItem } from 'vant';
// Vue.use(Tabbar);
// Vue.use(TabbarItem);

// import Vue from 'vue'
// import VueRouter from 'vue-router'

// ========================路由=========================
// Vue.use(VueRouter)
// //路由表
// const routes = [
//   {
//     path:'pages/home_center/common_panel',
//     name:'common_panel',
//     component:()=>import('@/views/login/')
//   },
//   {
//     path:'/',
//     component:()=>import('@/views/layout/'),
//     children:[
//       {
//         path:'',//首页是默认子路由，所谓为空
//         name:'home',
//         component:()=>import('@/views/home/')
//       },
//       {
//         path:'pages/home_center/timing',
//         name:'timing',
//         component:()=>import('@/views/question/')
//       },
//       {
//         path:'pages/home_center/count_down',
//         name:'count_down',
//         component:()=>import('@/views/video/')
//       },
//       {
//         path:'pages/home_center/statistics',
//         name:'statistics',
//         component:()=>import('@/views/my/')
//       }
//     ]
//   }
// ]

// const router = new VueRouter({
//   routes
// })

// export default router
// =====================================================

Page({

  /**
   * 页面的初始数据
   */
  data: {
    active: 0,
    
    device_name: '',
    titleItem: {
      name: '',
      value: '',
    },
    roDpList: {}, //只上报功能点
    rwDpList: {}, //可上报可下发功能点
    isRoDpListShow: false,
    isRwDpListShow: false,
    forest: '../../../image/forest@2x.png'
  },

  // methods: {
  //   handleProxy(e) {
  //     WSH.wx.switchTab({
  //       url: 'url',
  //       complete: (res) => {},
  //     })
  //   }
  // },
  
  onChange(event) {
    // event.detail 的值为当前选中项的索引
    this.setData({ active: event.detail });
  },

  onClick(event) {
    wx.showToast({
      title: `点击标签 ${event.detail + 1}`,
      icon: 'none',
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const { device_id } = options
    this.setData({ device_id })

    // mqtt消息监听
    wxMqtt.on('message', (topic, newVal) => {
      const { status } = newVal
      console.log(newVal)
      this.updateStatus(status)
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: async function () {
    const { device_id } = this.data
    const [{ name, status, icon }, { functions = [] }] = await Promise.all([
      getDeviceDetails(device_id),
      getDevFunctions(device_id),
    ]);

    const { roDpList, rwDpList } = this.reducerDpList(status, functions)

    // 获取头部展示功能点信息
    let titleItem = {
      name: '',
      value: '',
    };
    if (Object.keys(roDpList).length > 0) {
      let keys = Object.keys(roDpList)[0];
      titleItem = roDpList[keys];
      // ============ add start ============
      if (titleItem.value == 'true') {
        titleItem.value = "On";
      } else if (titleItem.value == 'false') {
        titleItem.value = "Off";
      }
      // ============= add end ==============
    } else {
      let keys = Object.keys(rwDpList)[0];
      titleItem = rwDpList[keys];
      // ============ add start ============
      if (titleItem.value == 'true') {
        titleItem.value = "On";
      } else if (titleItem.value == 'false') {
        titleItem.value = "Off";
      }
      // ============= add end ==============
    }

    const roDpListLength = Object.keys(roDpList).length
    const isRoDpListShow = Object.keys(roDpList).length > 0
    const isRwDpListShow = Object.keys(rwDpList).length > 0

    this.setData({ titleItem, roDpList, rwDpList, device_name: name, isRoDpListShow, isRwDpListShow, roDpListLength, icon })
  },

  // 分离只上报功能点，可上报可下发功能点
  reducerDpList: function (status, functions) {
    // 处理功能点和状态的数据
    let roDpList = {};
    let rwDpList = {};
    if (status && status.length) {
      status.map((item) => {
        const { code, value } = item;
        let isExit = functions.find(element => element.code == code);
        if (isExit) {
          let rightvalue = value
          // 兼容初始拿到的布尔类型的值为字符串类型
          if (isExit.type === 'Boolean') {
            rightvalue = value == 'true'
          }

          rwDpList[code] = {
            code,
            value: rightvalue,
            type: isExit.type,
            values: isExit.values,
            name: isExit.name,
          };
        } else {
          roDpList[code] = {
            code,
            value,
            name: code,
          };
        }
      });
    }
    return { roDpList, rwDpList }
  },

  sendDp: async function (e) {
    const { dpCode, value } = e.detail
    const { device_id } = this.data

    const { success } = await deviceControl(device_id, dpCode, value)
  },

  updateStatus: function (newStatus) {
    let { roDpList, rwDpList, titleItem } = this.data

    newStatus.forEach(item => {
      const { code, value } = item

      if (typeof roDpList[code] !== 'undefined') {
        roDpList[code]['value'] = value;
      } else if (rwDpList[code]) {
        rwDpList[code]['value'] = value;
      }
    })

    // 更新titleItem
    if (Object.keys(roDpList).length > 0) {
      let keys = Object.keys(roDpList)[0];
      titleItem = roDpList[keys];
    } else {
      let keys = Object.keys(rwDpList)[0];
      titleItem = rwDpList[keys];
    }
 
    this.setData({ titleItem, roDpList: { ...roDpList }, rwDpList: { ...rwDpList } })
  },

  jumpTodeviceEditPage: function(){
    console.log('jumpTodeviceEditPage')
    const { icon, device_id, device_name } = this.data
    wx.navigateTo({
      url: `/pages/home_center/device_manage/index?device_id=${device_id}&device_name=${device_name}&device_icon=${icon}`,
    })
  },

  jumpToCommonpanelPage({currentTarget}) {
    console.log('jumpToCommonpanelPage')
    const { dataset: { device } } = currentTarget
    const { icon, device_id, device_name } = this.data
    wx.redirectTo({
      url: `/pages/home_center/common_panel/index?device_id=${device_id}&device_name=${device_name}`,
    })
  },

  jumpToTimingPage({currentTarget}) {
    console.log('jumpToTimingPage')
    const { dataset: { device } } = currentTarget
    const { icon, device_id, device_name } = this.data
    wx.redirectTo({
      url: `/pages/home_center/timing/index?device_id=${device_id}&device_name=${device_name}`,
    })
  },

  jumpToCountdownPage({currentTarget}) {
    console.log('jumpToCountdownPage')
    const { dataset: { device } } = currentTarget
    const { icon, device_id, device_name } = this.data
    wx.redirectTo({
      url: `/pages/home_center/count_down/index?device_id=${device_id}&device_name=${device_name}`,
    })
  },

  jumpToStatisticsPage({currentTarget}) {
    console.log('jumpToStatisticsPage')
    const { dataset: { device } } = currentTarget
    const { icon, device_id, device_name } = this.data
    wx.redirectTo({
      url: `/pages/home_center/statistics/index?device_id=${device_id}&device_name=${device_name}`,
    })
  }
})